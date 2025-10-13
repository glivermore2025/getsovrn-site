// /pages/api/stripe-webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // RLS bypass
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig!, endpointSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Stripe signature verification failed:', message);
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const type = session.metadata?.type; // 'dataset' | 'listing'
    const userId = session.metadata?.user_id || null;

    if (!type || !userId) {
      console.warn('⚠️ Missing metadata in Stripe session:', session.id, session.metadata);
      return res.status(400).send('Missing purchase metadata');
    }

    // Idempotency check (purchases table for legacy; adjust if you track dataset separately)
    const { data: existing, error: fetchError } = await supabase
      .from('purchases')
      .select('id')
      .eq('session_id', session.id)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error checking for existing purchase:', fetchError);
      return res.status(500).send('Database query failed');
    }

    if (existing) {
      console.log(`ℹ️ Already processed session ${session.id}`);
      return res.status(200).json({ received: true });
    }

    // TOTAL charged (post-discounts/tax), in dollars
    const grossAmount = session.amount_total ? session.amount_total / 100 : null;

    try {
      if (type === 'dataset') {
        const datasetId = session.metadata?.dataset_id;
        const qty = Math.max(1, parseInt(session.metadata?.quantity || '1', 10));

        if (!datasetId) {
          console.warn('⚠️ Missing dataset_id in metadata for session', session.id);
          return res.status(400).send('Missing dataset_id');
        }

        // Record a single row in purchases to satisfy idempotency (you can also create a dedicated table)
        const { error: purchaseError } = await supabase.from('purchases').insert([{
          user_id: userId,
          listing_id: null,        // legacy column—nullable
          session_id: session.id,
          dataset_id: datasetId,   // if you added this column; otherwise remove
        }]);
        if (purchaseError) {
          console.error('❌ Failed to insert purchase:', purchaseError);
          return res.status(500).send('Failed to record purchase');
        }

        // Record dataset sale (quantity-aware)
        const { error: saleErr } = await supabase.from('dataset_sales').insert([{
          dataset_id: datasetId,
          buyer_id: userId,
          quantity: qty,                                 // NEW
          gross_amount: grossAmount,                     // total charged
          session_id: session.id,
          purchased_at: new Date().toISOString(),
        }]);
        if (saleErr) {
          console.error('❌ Failed to insert dataset sale:', saleErr);
          return res.status(500).send('Failed to record dataset sale');
        }

        // Optional: also add a row into transactions for global reporting
        const { error: txnErr } = await supabase.from('transactions').insert([{
          buyer_id: userId,
          listing_id: null,       // legacy column—nullable
          dataset_id: datasetId,  // if you added this column; otherwise remove
          purchase_price: grossAmount,
          purchased_at: new Date().toISOString(),
        }]);
        if (txnErr) {
          console.error('❌ Failed to insert transaction:', txnErr);
          return res.status(500).send('Failed to record transaction');
        }
      } else if (type === 'listing') {
        const listingId = session.metadata?.listing_id;
        if (!listingId) {
          console.warn('⚠️ Missing listing_id in metadata for session', session.id);
          return res.status(400).send('Missing listing_id');
        }

        const { error: purchaseError } = await supabase.from('purchases').insert([{
          user_id: userId,
          listing_id: listingId,
          session_id: session.id,
        }]);
        if (purchaseError) {
          console.error('❌ Failed to insert purchase:', purchaseError);
          return res.status(500).send('Failed to record purchase');
        }

        const { error: txnError } = await supabase.from('transactions').insert([{
          buyer_id: userId,
          listing_id: listingId,
          purchase_price: grossAmount,
          purchased_at: new Date().toISOString(),
        }]);
        if (txnError) {
          console.error('❌ Failed to insert transaction:', txnError);
          return res.status(500).send('Failed to record transaction');
        }
      }

      console.log(`✅ Recorded ${type} checkout: session ${session.id}`);
    } catch (err) {
      console.error('❌ Unhandled webhook error:', err);
      return res.status(500).send('Internal server error');
    }
  }

  return res.status(200).json({ received: true });
}


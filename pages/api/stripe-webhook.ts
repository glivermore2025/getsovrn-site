// /pages/api/stripe-webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

// Service role for secure writes + RLS bypass
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    const datasetId = session.metadata?.dataset_id;
    const listingId = session.metadata?.listing_id;
    const userId = session.metadata?.user_id || null;
    const amountTotal = session.amount_total ?? 0; // in cents

    try {
      // ----- NEW: DATASET PURCHASE PATH -----
      if (datasetId) {
        // idempotency: check dataset_purchases by stripe_session_id
        const { data: existingPurchase, error: existingErr } = await supabaseAdmin
          .from('dataset_purchases')
          .select('id')
          .eq('stripe_session_id', session.id)
          .maybeSingle();

        if (existingErr) {
          console.error('❌ Query existing dataset purchase failed:', existingErr);
          return res.status(500).send('Database query failed');
        }

        if (!existingPurchase) {
          // insert purchase
          const { data: inserted, error: insErr } = await supabaseAdmin
            .from('dataset_purchases')
            .insert([{
              dataset_id: datasetId,
              buyer_user_id: userId, // may be null if buyer is guest
              stripe_session_id: session.id,
              gross_revenue_cents: amountTotal,
              currency: session.currency || 'usd',
            }])
            .select('id')
            .maybeSingle();

          if (insErr || !inserted) {
            console.error('❌ Insert dataset purchase failed:', insErr);
            return res.status(500).send('Failed to record dataset purchase');
          }

          // allocate revenue to contributors
          const { error: allocErr } = await supabaseAdmin.rpc('allocate_revenue_for_purchase', {
            p_purchase_id: inserted.id,
          });

          if (allocErr) {
            console.error('❌ Revenue allocation failed:', allocErr);
            // We still return 200 to avoid Stripe retries looping forever,
            // but log loudly so we can investigate and re-run allocation manually.
          } else {
            console.log(`✅ Dataset purchase allocated: ${inserted.id}`);
          }
        } else {
          console.log(`ℹ️ Dataset purchase already recorded for session ${session.id}`);
        }

        return res.status(200).json({ received: true });
      }

      // ----- LEGACY: LISTING PURCHASE PATH (your existing flow) -----
      if (!listingId || !userId) {
        console.warn('⚠️ Missing listing purchase metadata in Stripe session:', session.id);
        return res.status(400).send('Missing purchase metadata');
      }

      // idempotency: check purchases by session_id
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('purchases')
        .select('id')
        .eq('session_id', session.id)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Error checking for existing purchase:', fetchError);
        return res.status(500).send('Database query failed');
      }

      if (!existing) {
        // purchases
        const { error: purchaseError } = await supabaseAdmin.from('purchases').insert([{
          user_id: userId,
          listing_id: listingId,
          session_id: session.id,
        }]);

        if (purchaseError) {
          console.error('❌ Failed to insert purchase:', purchaseError);
          return res.status(500).send('Failed to record purchase');
        }

        // transactions
        const purchasePrice = session.amount_total ? session.amount_total / 100 : null;
        const { error: txnError } = await supabaseAdmin.from('transactions').insert([{
          buyer_id: userId,
          listing_id: listingId,
          purchase_price: purchasePrice,
          purchased_at: new Date().toISOString(),
        }]);

        if (txnError) {
          console.error('❌ Failed to insert transaction:', txnError);
          return res.status(500).send('Failed to record transaction');
        }

        console.log(`✅ Listing purchase and transaction recorded: session ${session.id}`);
      } else {
        console.log(`ℹ️ Purchase already exists for session ${session.id}`);
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('❌ Unhandled webhook error:', err);
      return res.status(500).send('Internal server error');
    }
  }

  return res.status(200).json({ received: true });
}

// /pages/api/stripe-webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Keep stable & compatible with your Stripe settings
  apiVersion: '2022-11-15',
});

// Service role client (server-only)
const supabase = createClient(
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

  if (event.type !== 'checkout.session.completed') {
    // Acknowledge other events without work
    return res.status(200).json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Common, safe helpers
  const amountTotalCents = typeof session.amount_total === 'number' ? session.amount_total : 0;
  const sessionId = session.id;
  const metadata = session.metadata || {};
  const userId = metadata.user_id || null;
  const listingId = metadata.listing_id || null;
  const datasetId = metadata.dataset_id || null;

  if (!userId) {
    console.warn('⚠️ checkout.session.completed without user_id metadata', { sessionId });
    return res.status(400).send('Missing user_id metadata');
  }

  try {
    if (datasetId) {
      // -----------------------------
      // DATASET SALE (mutual-fund flow)
      // -----------------------------

      // Idempotency: ensure we don’t double-insert the sale
      const { data: existingSale, error: checkSaleErr } = await supabase
        .from('dataset_sales')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (checkSaleErr) {
        console.error('❌ Error checking existing dataset sale:', checkSaleErr);
        return res.status(500).send('Database query failed');
      }

      if (!existingSale) {
        const { error: saleErr } = await supabase.from('dataset_sales').insert([
          {
            dataset_id: datasetId,
            buyer_id: userId,
            amount_cents: amountTotalCents,
            quantity: 1,
            stripe_session_id: sessionId,
          },
        ]);
        if (saleErr) {
          console.error('❌ Failed to insert dataset sale:', saleErr);
          return res.status(500).send('Failed to record dataset sale');
        }

        // Your trigger public.on_dataset_sale_after_insert() will call distribute_dataset_sale(new.id)
        console.log(`✅ Dataset sale recorded & distribution triggered. session=${sessionId}`);
      } else {
        console.log(`ℹ️ Dataset sale already exists for session ${sessionId}`);
      }
    } else if (listingId) {
      // -----------------------------
      // LISTING PURCHASE (one-off file sale flow)
      // -----------------------------

      // Idempotency: ensure we don’t double-insert the purchase
      const { data: existingPurchase, error: checkPurchaseErr } = await supabase
        .from('purchases')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (checkPurchaseErr) {
        console.error('❌ Error checking existing purchase:', checkPurchaseErr);
        return res.status(500).send('Database query failed');
      }

      if (!existingPurchase) {
        // Insert into purchases
        const { error: purchaseErr } = await supabase.from('purchases').insert([
          { user_id: userId, listing_id: listingId, session_id: sessionId },
        ]);
        if (purchaseErr) {
          console.error('❌ Failed to insert purchase:', purchaseErr);
          return res.status(500).send('Failed to record purchase');
        }

        // Insert into transactions (for admin metrics)
        const { error: txnErr } = await supabase.from('transactions').insert([
          {
            buyer_id: userId,
            listing_id: listingId,
            purchase_price: amountTotalCents ? amountTotalCents / 100 : null,
            purchased_at: new Date().toISOString(),
          },
        ]);
        if (txnErr) {
          console.error('❌ Failed to insert transaction:', txnErr);
          return res.status(500).send('Failed to record transaction');
        }

        console.log(`✅ Listing purchase & transaction recorded. session=${sessionId}`);
      } else {
        console.log(`ℹ️ Listing purchase already exists for session ${sessionId}`);
      }
    } else {
      // Neither dataset_id nor listing_id present
      console.warn('⚠️ checkout.session.completed missing dataset_id AND listing_id metadata', { sessionId, metadata });
      return res.status(400).send('Missing dataset_id or listing_id metadata');
    }
  } catch (err) {
    console.error('❌ Unhandled webhook error:', err);
    return res.status(500).send('Internal server error');
  }

  return res.status(200).json({ received: true });
}

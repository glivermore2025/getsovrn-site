import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body
  },
};

import getRawBody from 'raw-body';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const sig = req.headers['stripe-signature']!;
  const rawBody = await getRawBody(req);

  const supabase = getSupabaseClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionType = session.metadata?.type;

    // ===== DATASET PURCHASE =====
    if (sessionType === 'dataset') {
      const datasetId = session.metadata?.dataset_id;
      const userId = session.metadata?.user_id;
      const quantity = session.metadata?.quantity ? parseInt(session.metadata.quantity, 10) : 1;
      // Note: filter_json is in metadata but dataset_purchases doesn't have this column yet.
      // TODO: Add filter_json, export_path columns to dataset_purchases for reproducible exports.

      if (!datasetId || !userId || !session.id) {
        console.error('Missing metadata in dataset purchase session:', {
          datasetId,
          userId,
          sessionId: session.id,
        });
        return res.status(400).end();
      }

      // Calculate gross revenue from line items
      let grossRevenueCents = 0;
      if (session.line_items) {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        for (const item of lineItems.data) {
          if (item.price?.unit_amount) {
            grossRevenueCents += item.price.unit_amount * (item.quantity || 1);
          }
        }
      }

      const { error } = await supabase.from('dataset_purchases').upsert(
        [
          {
            dataset_id: datasetId,
            buyer_user_id: userId,
            stripe_session_id: session.id,
            gross_revenue_cents: grossRevenueCents,
            currency: session.currency || 'usd',
          },
        ],
        {
          onConflict: 'stripe_session_id',
        }
      );

      if (error) {
        console.error('Failed to insert dataset purchase:', error);
        return res.status(500).end();
      }

      console.log('Dataset purchase recorded:', {
        datasetId,
        userId,
        sessionId: session.id,
        grossRevenueCents,
      });
    }

    // ===== LEGACY LISTING PURCHASE =====
    else if (sessionType === 'listing') {
      const userId = session.metadata?.user_id;
      const listingId = session.metadata?.listing_id;

      if (!userId || !listingId || !session.id) {
        console.error('Missing metadata in listing purchase session');
        return res.status(400).end();
      }

      const { error } = await supabase.from('purchases').insert([
        {
          user_id: userId,
          listing_id: listingId,
          session_id: session.id,
        },
      ]);

      if (error) {
        console.error('Failed to insert listing purchase:', error);
        return res.status(500).end();
      }

      console.log('Listing purchase recorded:', {
        userId,
        listingId,
        sessionId: session.id,
      });
    }

    // ===== UNKNOWN TYPE =====
    else {
      console.warn('Unknown session type in webhook:', sessionType);
    }
  }

  res.status(200).end();
}

// /pages/api/stripe-webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { supabase } from '../../lib/supabaseClient';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig!, endpointSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook Error:', err);
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const listingId = session.metadata?.listing_id;
    const userId = session.metadata?.user_id;

    if (!listingId || !userId) {
      console.warn('Missing metadata in session:', session.id);
      return res.status(400).send('Missing purchase metadata');
    }

    try {
      // Check for duplicate entry by session_id
      const { data: existing, error: fetchError } = await supabase
        .from('purchases')
        .select('id')
        .eq('session_id', session.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking for existing purchase:', fetchError);
        return res.status(500).send('Database query failed');
      }

      if (!existing) {
        const { error: insertError } = await supabase.from('purchases').insert([
          {
            user_id: userId,
            listing_id: listingId,
            session_id: session.id,
          },
        ]);

        if (insertError) {
          console.error('Failed to insert purchase:', insertError);
          return res.status(500).send('Failed to record purchase');
        }
      } else {
        console.log(`Purchase already recorded for session ${session.id}`);
      }
    } catch (err) {
      console.error('Unhandled error during purchase insertion:', err);
      return res.status(500).send('Internal server error');
    }
  }

  res.status(200).json({ received: true });
}

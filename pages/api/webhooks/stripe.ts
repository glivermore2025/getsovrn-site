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

    const userId = session.metadata?.user_id;
    const listingId = session.metadata?.listing_id;

    if (!userId || !listingId || !session.id) {
      console.error('Missing metadata in session');
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
      console.error('Failed to insert purchase:', error);
      return res.status(500).end();
    }
  }

  res.status(200).end();
}

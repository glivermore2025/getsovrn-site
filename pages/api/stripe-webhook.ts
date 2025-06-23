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

    if (listingId && userId) {
      await supabase.from('purchases').insert([
        {
          user_id: userId,
          listing_id: listingId,
          session_id: session.id,
        },
      ]);
    }
  }

  res.status(200).json({ received: true });
}

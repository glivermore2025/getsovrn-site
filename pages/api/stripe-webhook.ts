import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { recordCheckoutSession } from '../../lib/stripePurchaseRecorder';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error newer version not yet reflected in installed stripe types
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const sig = req.headers['stripe-signature'];
  const rawBody = await buffer(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? '', endpointSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Stripe signature verification failed:', message);
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const recorded = await recordCheckoutSession(stripe, session);
      if (!recorded) {
        console.warn('Unknown session type in webhook:', session.metadata?.type);
      }
    } catch (err) {
      console.error('Unhandled webhook error:', err);
      return res.status(500).send('Internal server error');
    }
  }

  return res.status(200).json({ received: true });
}

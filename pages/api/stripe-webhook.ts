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

// Use Supabase service role key for secure server-side access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Required for bypassing RLS
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
    const listingId = session.metadata?.listing_id;
    const userId = session.metadata?.user_id;

    if (!listingId || !userId) {
      console.warn('⚠️ Missing metadata in Stripe session:', session.id);
      return res.status(400).send('Missing purchase metadata');
    }

    try {
      // Check if this session has already been processed
      const { data: existing, error: fetchError } = await supabase
        .from('purchases')
        .select('id')
        .eq('session_id', session.id)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Error checking for existing purchase:', fetchError);
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
          console.error('❌ Failed to insert purchase:', insertError);
          return res.status(500).send('Failed to record purchase');
        }

        console.log(`✅ Purchase recorded: session ${session.id}`);
      } else {
        console.log(`ℹ️ Purchase already exists for session ${session.id}`);
      }
    } catch (err) {
      console.error('❌ Unhandled webhook error:', err);
      return res.status(500).send('Internal server error');
    }
  }

  return res.status(200).json({ received: true });
}

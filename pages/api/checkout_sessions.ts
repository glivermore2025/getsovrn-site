// /pages/api/checkout_sessions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error: newer version not yet reflected in types
  apiVersion: '2023-10-16',
});

// Use anon for reads here (pricing/name). We are not writing from this route.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { datasetId, listingId, userId } = req.body as {
    datasetId?: string;
    listingId?: string;
    userId?: string;
  };

  try {
    // --- CASE 1: DATASET CHECKOUT (new pooled model)
    if (datasetId) {
      const { data: ds, error: dsErr } = await supabase
        .from('datasets')
        .select('id, name, description, unit_price_cents')
        .eq('id', datasetId)
        .maybeSingle();

      if (dsErr || !ds) {
        return res.status(400).json({ error: 'Dataset not found' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: ds.name,
                description: ds.description ?? undefined,
              },
              unit_amount: ds.unit_price_cents, // already in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancel`,
        metadata: {
          dataset_id: ds.id,
          user_id: userId || 'guest',
        },
      });

      return res.status(200).json({ url: session.url });
    }

    // --- CASE 2: LISTING CHECKOUT (legacy single listing)
    if (listingId) {
      const { data: listing, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error || !listing) {
        return res.status(400).json({ error: 'Listing not found' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: listing.title,
                description: listing.description ?? undefined,
              },
              unit_amount: Math.round(listing.price * 100), // price in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancel`,
        metadata: {
          listing_id: listing.id,
          user_id: userId || 'guest',
        },
      });

      return res.status(200).json({ url: session.url });
    }

    return res.status(400).json({ error: 'Provide datasetId or listingId' });
  } catch (e: any) {
    console.error('checkout_sessions error:', e);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

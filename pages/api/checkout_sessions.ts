import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error: newer version not yet reflected in types
  apiVersion: '2023-10-16',
});

// Read-only Supabase client (anon key is fine for reads)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function siteUrl(req: NextApiRequest) {
  // Prefer explicit env; fallback to request host if you access locally
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { datasetId, listingId, userId } = req.body as {
    datasetId?: string;
    listingId?: string;
    userId?: string;
  };

  if (!datasetId && !listingId) {
    return res.status(400).json({ error: 'Provide datasetId or listingId' });
  }
  if (!userId) {
    // You can loosen this if you truly support guest checkout
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // Fetch email from profiles for nicer Stripe receipts & customer history
    let customerEmail: string | undefined = undefined;
    {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.email) customerEmail = profile.email;
    }

    const baseUrl = siteUrl(req);

    // --- CASE 1: DATASET CHECKOUT (pooled model)
    if (datasetId) {
      const { data: ds, error: dsErr } = await supabase
        .from('datasets')
        .select('id, name, description, unit_price_cents, is_active')
        .eq('id', datasetId)
        .maybeSingle();

      if (dsErr || !ds) {
        return res.status(400).json({ error: 'Dataset not found' });
      }
      if (!ds.is_active) {
        return res.status(400).json({ error: 'Dataset is not active' });
      }
      if (!Number.isFinite(ds.unit_price_cents) || ds.unit_price_cents <= 0) {
        return res.status(400).json({ error: 'Invalid dataset price' });
      }

      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
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
          success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/cancel`,
          customer_email: customerEmail,
          billing_address_collection: 'auto',
          allow_promotion_codes: true,
          client_reference_id: `dataset:${ds.id}:user:${userId}`,
          metadata: {
            type: 'dataset',
            dataset_id: ds.id,
            user_id: userId,
          },
        }
        // You could pass an idempotency key as 2nd arg if you generate one client-side
      );

      return res.status(200).json({ url: session.url });
    }

    // --- CASE 2: LISTING CHECKOUT (legacy single listing)
    if (listingId) {
      const { data: listing, error } = await supabase
        .from('listings')
        .select('id, title, description, price, is_flagged')
        .eq('id', listingId)
        .maybeSingle();

      if (error || !listing) {
        return res.status(400).json({ error: 'Listing not found' });
      }
      if (listing.is_flagged) {
        return res.status(400).json({ error: 'Listing is not available' });
      }
      if (!Number.isFinite(listing.price) || listing.price <= 0) {
        return res.status(400).json({ error: 'Invalid listing price' });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
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
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cancel`,
        customer_email: customerEmail,
        billing_address_collection: 'auto',
        allow_promotion_codes: true,
        client_reference_id: `listing:${listing.id}:user:${userId}`,
        metadata: {
          type: 'listing',
          listing_id: listing.id,
          user_id: userId,
        },
      });

      return res.status(200).json({ url: session.url });
    }

    // Fallback (shouldn’t reach here due to early checks)
    return res.status(400).json({ error: 'Provide datasetId or listingId' });
  } catch (e: any) {
    console.error('checkout_sessions error:', e);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}


// /pages/api/session/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getSupabaseClient } from '../../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error newer types not reflected yet
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    const session = await stripe.checkout.sessions.retrieve(id as string);

    const listingId = session.metadata?.listing_id;
    if (!listingId) throw new Error('Listing ID missing from session metadata');

    const supabase = getSupabaseClient();
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (error || !listing) throw new Error('Listing not found');

    return res.status(200).json({ listing });
  } catch (err) {
    console.error('Session fetch error:', err);
    return res.status(400).json({ error: 'Unable to fetch session data' });
  }
}

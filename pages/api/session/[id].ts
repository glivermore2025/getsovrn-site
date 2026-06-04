import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error newer version not yet reflected in installed stripe types
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Missing session id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    const supabase = getSupabaseAdminClient();

    if (session.metadata?.type === 'dataset') {
      const datasetId = session.metadata?.dataset_id;
      if (!datasetId) throw new Error('Dataset ID missing from session metadata');

      const { data: dataset, error } = await supabase
        .from('datasets')
        .select('id, slug, name, description, unit_price_cents')
        .eq('id', datasetId)
        .single();

      if (error || !dataset) throw new Error('Dataset not found');

      return res.status(200).json({
        sessionType: 'dataset',
        dataset,
      });
    }

    const listingId = session.metadata?.listing_id;
    if (!listingId) throw new Error('Listing ID missing from session metadata');

    const { data: listing, error } = await supabase
      .from('listings')
      .select('id, title, description, file_path, price')
      .eq('id', listingId)
      .single();

    if (error || !listing) throw new Error('Listing not found');

    return res.status(200).json({
      sessionType: 'listing',
      listing,
    });
  } catch (err) {
    console.error('Session fetch error:', err);
    return res.status(400).json({ error: 'Unable to fetch session data' });
  }
}

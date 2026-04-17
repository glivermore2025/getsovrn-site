import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type PreviewFilters = {
  dateFrom?: string;
  dateTo?: string;
  platforms?: string[];
  carriers?: string[];
  networkTypes?: string[];
  uptimeMin?: number;
  uptimeMax?: number;
  disconnectMin?: number;
  disconnectMax?: number;
  limit?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as PreviewFilters;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from('dataset_connectivity_daily')
    .select(
      'date, platform, carrier, primary_network, disconnect_count, uptime_pct',
      { count: 'exact' }
    )
    .eq('sellable', true)
    .order('date', { ascending: false })
    .limit(body.limit ?? 100);

  if (body.dateFrom) query = query.gte('date', body.dateFrom);
  if (body.dateTo) query = query.lte('date', body.dateTo);
  if (body.platforms?.length) query = query.in('platform', body.platforms);
  if (body.carriers?.length) query = query.in('carrier', body.carriers);
  if (body.networkTypes?.length) query = query.in('primary_network', body.networkTypes);
  if (body.uptimeMin != null) query = query.gte('uptime_pct', body.uptimeMin);
  if (body.uptimeMax != null) query = query.lte('uptime_pct', body.uptimeMax);
  if (body.disconnectMin != null) query = query.gte('disconnect_count', body.disconnectMin);
  if (body.disconnectMax != null) query = query.lte('disconnect_count', body.disconnectMax);

  const { data, error, count } = await query;
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ rows: data ?? [], totalCount: count ?? 0 });
}

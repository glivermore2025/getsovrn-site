import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type ConnectivityPreviewFilters = {
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

type ConnectivityPreviewRow = {
  date: string;
  platform?: string | null;
  carrier?: string | null;
  primary_network?: string | null;
  disconnect_count: number;
  uptime_pct: number | null;
};

type PreviewResponse = {
  rows: ConnectivityPreviewRow[];
  totalCount: number;
  appliedLimit: number;
  sellableOnly: boolean;
};

type ErrorResponse = {
  error: string;
};

/**
 * Connectivity dataset preview endpoint
 * Returns aggregated, anonymized connectivity data without user/device identifiers.
 * 
 * Privacy note: Does not expose user_id, device_install_id, or raw payload_json.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreviewResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as ConnectivityPreviewFilters;

    // ===== INPUT VALIDATION =====
    
    // Validate date range if provided
    if (body.dateFrom && isNaN(new Date(body.dateFrom).getTime())) {
      return res.status(400).json({ error: 'Invalid dateFrom format' });
    }
    if (body.dateTo && isNaN(new Date(body.dateTo).getTime())) {
      return res.status(400).json({ error: 'Invalid dateTo format' });
    }

    // Validate numeric ranges (0-100 for uptime)
    if (body.uptimeMin != null && (body.uptimeMin < 0 || body.uptimeMin > 100)) {
      return res.status(400).json({ error: 'uptimeMin must be 0-100' });
    }
    if (body.uptimeMax != null && (body.uptimeMax < 0 || body.uptimeMax > 100)) {
      return res.status(400).json({ error: 'uptimeMax must be 0-100' });
    }

    // Validate disconnect counts >= 0
    if (body.disconnectMin != null && body.disconnectMin < 0) {
      return res.status(400).json({ error: 'disconnectMin must be >= 0' });
    }
    if (body.disconnectMax != null && body.disconnectMax < 0) {
      return res.status(400).json({ error: 'disconnectMax must be >= 0' });
    }

    // Clamp limit between 1 and 500
    const limit = Math.max(1, Math.min(500, body.limit ?? 100));

    // Sanitize arrays (remove empty strings, trim)
    const platforms = (body.platforms ?? [])
      .map((s) => (s ?? '').trim())
      .filter((s) => s.length > 0);
    const carriers = (body.carriers ?? [])
      .map((s) => (s ?? '').trim())
      .filter((s) => s.length > 0);
    const networkTypes = (body.networkTypes ?? [])
      .map((s) => (s ?? '').trim())
      .filter((s) => s.length > 0);

    // ===== QUERY CONSTRUCTION =====

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
      .limit(limit);

    if (body.dateFrom) query = query.gte('date', body.dateFrom);
    if (body.dateTo) query = query.lte('date', body.dateTo);
    if (platforms.length > 0) query = query.in('platform', platforms);
    if (carriers.length > 0) query = query.in('carrier', carriers);
    if (networkTypes.length > 0) query = query.in('primary_network', networkTypes);
    if (body.uptimeMin != null) query = query.gte('uptime_pct', body.uptimeMin);
    if (body.uptimeMax != null) query = query.lte('uptime_pct', body.uptimeMax);
    if (body.disconnectMin != null) query = query.gte('disconnect_count', body.disconnectMin);
    if (body.disconnectMax != null) query = query.lte('disconnect_count', body.disconnectMax);

    const { data, error, count } = await query;

    if (error) {
      console.error('Preview query error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      rows: data ?? [],
      totalCount: count ?? 0,
      appliedLimit: limit,
      sellableOnly: true,
    });
  } catch (err: any) {
    console.error('Preview handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

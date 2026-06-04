import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/apiAuth';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

type RequestBody = {
  startDate?: string;
  endDate?: string;
};

type SuccessResponse = {
  success: boolean;
  message: string;
  startDate: string;
  endDate: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    try {
      await requireAdmin(req);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Unauthorized';
      const status = message === 'Insufficient privileges' ? 403 : 401;
      return res.status(status).json({ error: message });
    }

    const body = req.body as RequestBody;

    // Validate and parse dates
    let startDate: string;
    let endDate: string;

    if (body.startDate) {
      const parsed = new Date(body.startDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid startDate format' });
      }
      startDate = parsed.toISOString().split('T')[0];
    } else {
      // Default to today
      startDate = new Date().toISOString().split('T')[0];
    }

    if (body.endDate) {
      const parsed = new Date(body.endDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid endDate format' });
      }
      endDate = parsed.toISOString().split('T')[0];
    } else {
      // Default to today
      endDate = new Date().toISOString().split('T')[0];
    }

    // Ensure startDate <= endDate
    if (startDate > endDate) {
      return res.status(400).json({ error: 'startDate must be <= endDate' });
    }

    // Call the refresh function via RPC
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.rpc('refresh_connectivity_daily', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error('RPC call failed:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully refreshed connectivity data for ${startDate} to ${endDate}`,
      startDate,
      endDate,
    });
  } catch (err: any) {
    console.error('Admin refresh error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

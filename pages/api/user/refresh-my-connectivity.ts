import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type RefreshResponse = {
  success: boolean;
  message?: string;
};

type ErrorResponse = {
  error: string;
};

/**
 * User-scoped marketplace refresh API
 * 
 * Allows authenticated users to manually trigger refresh of their connectivity data
 * from device_events into dataset_connectivity_daily.
 * 
 * Authentication:
 * - Requires Supabase session (via cookie or Bearer token)
 * - Can be called from browser with session cookie
 * - Validates user identity server-side
 * 
 * Usage:
 * POST /api/user/refresh-my-connectivity
 * Headers: (session cookie auto-included by browser)
 * Body: { startDate?: string, endDate?: string } (optional, defaults to last 30 days)
 * 
 * Returns: { success: true, message?: string } or { error: string }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RefreshResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to get auth from Bearer token or session cookie
    const authHeader = req.headers.authorization;
    let token: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      // Session cookie will be handled by Supabase automatically
      token = null;
    }

    // Create Supabase client (with or without token)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Please sign in first' });
    }

    // Parse optional date range from request body
    let startDate = new Date();
    let endDate = new Date();
    
    if (req.body?.startDate) {
      const parsed = new Date(req.body.startDate);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    } else {
      // Default to last 30 days if not specified
      startDate.setDate(startDate.getDate() - 30);
    }

    if (req.body?.endDate) {
      const parsed = new Date(req.body.endDate);
      if (!isNaN(parsed.getTime())) {
        endDate = parsed;
      }
    }

    // Format dates for SQL (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Create admin client to call the RPC (requires service role)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Call the user-scoped refresh RPC
    const { error: rpcError } = await adminSupabase.rpc(
      'refresh_user_connectivity_daily',
      {
        p_user_id: user.id,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
      }
    );

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return res.status(500).json({ 
        error: `Failed to refresh marketplace data: ${rpcError.message}` 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Marketplace data refreshed for ${startDateStr} to ${endDateStr}` 
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/apiAuth';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

function statusForError(message: string) {
  if (message === 'Authentication required' || message === 'Invalid session') return 401;
  if (message === 'Insufficient privileges') return 403;
  return 500;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireAdmin(req);

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('transactions')
      .select(
        `
        id,
        listing_id,
        buyer_id,
        purchase_price,
        purchased_at,
        listings (title),
        profiles (email)
      `
      )
      .order('purchased_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ transactions: data ?? [] });
  } catch (error: any) {
    const message = error?.message ?? 'Failed to load transactions';
    return res.status(statusForError(message)).json({ error: message });
  }
}

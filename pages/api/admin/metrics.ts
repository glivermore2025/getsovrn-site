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
    const [
      { data: listings, error: listingsError },
      { data: transactions, error: transactionsError },
      { data: users, error: usersError },
    ] = await Promise.all([
      supabase.from('listings').select('id, user_id, title, price, created_at'),
      supabase.from('transactions').select('id, listing_id, buyer_id, purchase_price, purchased_at'),
      supabase.from('profiles').select('id'),
    ]);

    if (listingsError) throw listingsError;
    if (transactionsError) throw transactionsError;
    if (usersError) throw usersError;

    return res.status(200).json({
      listings: listings ?? [],
      transactions: transactions ?? [],
      users: users ?? [],
    });
  } catch (error: any) {
    const message = error?.message ?? 'Failed to load metrics';
    return res.status(statusForError(message)).json({ error: message });
  }
}

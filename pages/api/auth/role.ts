import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

type RoleResponse = {
  role: 'admin' | 'buyer' | 'seller' | 'consumer' | null;
  isAdmin: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<RoleResponse | { error: string }>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const supabase = getSupabaseAdminClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user role:', error);
    return res.status(500).json({ error: 'Failed to fetch user role' });
  }

  const role = (data?.role ?? null) as RoleResponse['role'];
  return res.status(200).json({
    role,
    isAdmin: role === 'admin',
  });
}

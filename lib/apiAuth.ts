import type { NextApiRequest } from 'next';
import { getSupabaseAdminClient } from './supabaseAdmin';

export function getBearerToken(req: NextApiRequest) {
  const authorization = req.headers.authorization;
  return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;
}

export async function requireAuthenticatedUser(req: NextApiRequest) {
  const token = getBearerToken(req);
  if (!token) throw new Error('Authentication required');

  const supabase = getSupabaseAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) throw new Error('Invalid session');
  return user;
}

export async function requireRole(req: NextApiRequest, roles: string[]) {
  const user = await requireAuthenticatedUser(req);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data?.role || !roles.includes(data.role)) {
    throw new Error('Insufficient privileges');
  }

  return { user, role: data.role as string };
}

export function requireAdmin(req: NextApiRequest) {
  return requireRole(req, ['admin']);
}

export function requireBuyer(req: NextApiRequest) {
  return requireRole(req, ['admin', 'buyer']);
}

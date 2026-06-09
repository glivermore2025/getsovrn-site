import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const USER_SCOPED_TABLES = [
  { table: 'buyer_post_optins', columns: ['user_id'] },
  { table: 'buyer_posts', columns: ['user_id'] },
  { table: 'buyer_saved_filters', columns: ['buyer_id', 'user_id'] },
  { table: 'buyer_access_requests', columns: ['buyer_id'] },
  { table: 'consent_preferences', columns: ['user_id'] },
  { table: 'dataset_access', columns: ['buyer_id', 'user_id'] },
  { table: 'dataset_connectivity_daily', columns: ['user_id'] },
  { table: 'dataset_contributions', columns: ['user_id'] },
  { table: 'dataset_payouts', columns: ['user_id'] },
  { table: 'dataset_purchases', columns: ['buyer_user_id', 'user_id'] },
  { table: 'dataset_sales', columns: ['buyer_id', 'user_id'] },
  { table: 'device_events', columns: ['user_id'] },
  { table: 'device_snapshots', columns: ['user_id'] },
  { table: 'listings', columns: ['user_id'] },
  { table: 'purchases', columns: ['user_id'] },
  { table: 'revenue_shares', columns: ['user_id'] },
  { table: 'transactions', columns: ['buyer_id', 'user_id'] },
  { table: 'user_balances', columns: ['user_id'] },
  { table: 'user_demographics', columns: ['user_id'] },
  { table: 'user_devices', columns: ['user_id'] },
  { table: 'user_module_permissions', columns: ['user_id'] },
  { table: 'user_roles', columns: ['user_id'] },
] as const;

const IGNORABLE_DELETE_ERROR_CODES = new Set([
  '42703', // undefined column
  '42P01', // undefined table
  'PGRST106',
  'PGRST200',
  'PGRST204',
  'PGRST205',
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(500).json({ error: 'Account deletion is not configured.' });
  }

  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const deleted: Record<string, number> = {};

  for (const { table, columns } of USER_SCOPED_TABLES) {
    let tableCount = 0;

    for (const column of columns) {
      const { count, error } = await adminClient
        .from(table)
        .delete({ count: 'exact' })
        .eq(column, user.id);

      if (error) {
        if (IGNORABLE_DELETE_ERROR_CODES.has(error.code)) {
          continue;
        }

        return res.status(500).json({
          error: `Failed to delete ${table}.${column}: ${error.message}`,
          deleted,
        });
      }

      tableCount += count ?? 0;
    }

    deleted[table] = tableCount;
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .delete()
    .eq('id', user.id);

  if (profileError) {
    return res.status(500).json({
      error: `Failed to delete profile: ${profileError.message}`,
      deleted,
    });
  }

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    return res.status(500).json({
      error: `Failed to delete auth user: ${deleteUserError.message}`,
      deleted,
    });
  }

  return res.status(200).json({
    deleted,
    profile_deleted: true,
    auth_user_deleted: true,
  });
}

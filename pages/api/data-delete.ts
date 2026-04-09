import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization' });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { module_key } = req.body ?? {};
  if (!module_key || typeof module_key !== 'string') {
    return res.status(400).json({ error: 'module_key is required' });
  }

  const { error: deleteError, count } = await supabase
    .from('device_events')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .eq('module_key', module_key);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  await supabase
    .from('user_module_permissions')
    .update({
      can_collect: false,
      can_sell: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('module_key', module_key);

  return res.status(200).json({
    deleted: count ?? 0,
    module_key,
    permissions_reset: true,
  });
}

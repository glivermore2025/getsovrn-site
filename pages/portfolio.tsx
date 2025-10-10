import Head from 'next/head';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Portfolio() {
  const [balance, setBalance] = useState<number>(0);
  const [shares, setShares] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bal } = await supabase.from('user_balances').select('balance_cents').eq('user_id', user.id).maybeSingle();
      setBalance((bal?.balance_cents ?? 0) / 100);

      const { data: rs } = await supabase
        .from('revenue_shares')
        .select('created_at, share_cents, dataset_id, datasets(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setShares(rs || []);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head><title>Portfolio – Sovrn</title></Head>
      <h1 className="text-3xl font-bold mb-6">Portfolio</h1>

      <div className="bg-gray-900 p-6 rounded mb-8">
        <p className="text-gray-400 text-sm">Available Balance</p>
        <p className="text-4xl font-bold">${balance.toFixed(2)}</p>
      </div>

      <h2 className="text-xl font-semibold mb-4">Recent Earnings</h2>
      <ul className="space-y-3">
        {shares.map((s, i) => (
          <li key={i} className="bg-gray-900 p-4 rounded">
            <div className="flex justify-between">
              <span>{s.datasets?.name || s.dataset_id}</span>
              <span>+ ${(s.share_cents/100).toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

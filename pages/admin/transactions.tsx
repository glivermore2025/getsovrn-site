import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { getCurrentUserIsAdmin } from '../../lib/roleAccess';
import { fetchAdminJson } from '../../lib/adminApi';

type AdminTransaction = {
  id: string;
  listing_id: string;
  buyer_id: string;
  purchase_price: number | null;
  purchased_at: string | null;
  listings?: { title?: string | null } | { title?: string | null }[] | null;
  profiles?: { email?: string | null } | { email?: string | null }[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user;
      if (!user || !(await getCurrentUserIsAdmin())) {
        router.push('/');
        return;
      }

      fetchTransactions();
    });
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminJson<{ transactions: AdminTransaction[] }>(
        '/api/admin/transactions'
      );
      setTransactions(data.transactions);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Transaction History</h1>
      {loading ? (
        <p>Loading transactions...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : transactions.length === 0 ? (
        <p>No transactions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-2 border border-gray-700">Buyer</th>
                <th className="p-2 border border-gray-700">Listing</th>
                <th className="p-2 border border-gray-700">Amount</th>
                <th className="p-2 border border-gray-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const listing = firstRelation(tx.listings);
                const profile = firstRelation(tx.profiles);

                return (
                  <tr key={tx.id} className="text-sm">
                    <td className="p-2 border border-gray-800">
                      {profile?.email || tx.buyer_id}
                    </td>
                    <td className="p-2 border border-gray-800">
                      {listing?.title || tx.listing_id}
                    </td>
                    <td className="p-2 border border-gray-800">
                      ${Number(tx.purchase_price ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2 border border-gray-800">
                      {tx.purchased_at ? new Date(tx.purchased_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

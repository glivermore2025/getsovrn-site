import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { getCurrentUserIsAdmin } from '../../lib/roleAccess';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user;
      if (!user || !(await getCurrentUserIsAdmin())) router.push('/');
    });

    fetchTransactions();
  }, []);

   const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        listing_id,
        buyer_id,
        purchase_price,
        purchased_at,
        listings (title),
        profiles (email)
      `)
      .order('purchased_at', { ascending: false });

     console.log('Fetched transactions:', data);

        if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data);
    }
  };

  fetchTransactions();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Transaction History</h1>
      {transactions.length === 0 ? (
        <p>No transactions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-2 border border-gray-700">Buyer</th>
                <th className="p-2 border border-gray-700">Listing ID</th>
                <th className="p-2 border border-gray-700">Amount</th>
                <th className="p-2 border border-gray-700">Status</th>
                <th className="p-2 border border-gray-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="text-sm">
                  <td className="p-2 border border-gray-800">{tx.buyer_id}</td>
                  <td className="p-2 border border-gray-800">{tx.listing_id}</td>
                  <td className="p-2 border border-gray-800">${tx.purchase_price?.toFixed(2)}</td>
                  <td className="p-2 border border-gray-800">{tx.status || '—'}</td>
                  <td className="p-2 border border-gray-800">{tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

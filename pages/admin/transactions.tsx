import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { ADMIN_USER_IDS } from '../../lib/constants';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user || !ADMIN_USER_IDS.includes(user.id)) router.push('/');
    });

    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTransactions(data);
  };

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

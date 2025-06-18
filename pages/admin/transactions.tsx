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
    const { data } = await supabase.from('transactions').select('*');
    if (data) setTransactions(data);
  };

  return (
    <div className="text-white p-8 bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Transactions</h1>
      <ul className="space-y-2">
        {transactions.map((tx) => (
          <li key={tx.id} className="border p-4 rounded bg-gray-800">
            <p>Listing: {tx.listing_id}</p>
            <p>Buyer: {tx.buyer_id}</p>
            <p>Amount: ${tx.purchase_price}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

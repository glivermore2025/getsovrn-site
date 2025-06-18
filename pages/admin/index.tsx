import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { ADMIN_USER_IDS } from '../../lib/constants';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setUser(u);

      if (!u || !ADMIN_USER_IDS.includes(u.id)) {
        router.push('/');
      }
    });
  }, []);

  return (
    <div className="text-white p-8 bg-gray-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <ul className="space-y-3">
        <li><a href="/admin/users" className="text-blue-400 hover:underline">Users</a></li>
        <li><a href="/admin/listings" className="text-blue-400 hover:underline">Listings</a></li>
        <li><a href="/admin/transactions" className="text-blue-400 hover:underline">Transactions</a></li>
      </ul>
    </div>
  );
}

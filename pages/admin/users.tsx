import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { ADMIN_USER_IDS } from '../../lib/constants';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user || !ADMIN_USER_IDS.includes(user.id)) router.push('/');
    });

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data) setUsers(data);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Registered Users</h1>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-2 border border-gray-700">ID</th>
                <th className="p-2 border border-gray-700">Email / Username</th>
                <th className="p-2 border border-gray-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="text-sm">
                  <td className="p-2 border border-gray-800">{user.id}</td>
                  <td className="p-2 border border-gray-800">{user.email || user.username || user.id}</td>
                  <td className="p-2 border border-gray-800">{user.created_at ? new Date(user.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

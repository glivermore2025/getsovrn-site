import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { getCurrentUserIsAdmin } from '../../lib/roleAccess';
import { fetchAdminJson } from '../../lib/adminApi';

type AdminUser = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  created_at?: string | null;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const supabase = getSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user;
      if (!user || !(await getCurrentUserIsAdmin())) {
        router.push('/');
        return;
      }

      fetchUsers();
    });
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminJson<{ users: AdminUser[] }>('/api/admin/users');
      setUsers(data.users);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Registered Users</h1>
      {loading ? (
        <p>Loading users...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-2 border border-gray-700">ID</th>
                <th className="p-2 border border-gray-700">Email / Name</th>
                <th className="p-2 border border-gray-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="text-sm">
                  <td className="p-2 border border-gray-800">{user.id}</td>
                  <td className="p-2 border border-gray-800">
                    {user.email || user.full_name || user.id}
                  </td>
                  <td className="p-2 border border-gray-800">
                    {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

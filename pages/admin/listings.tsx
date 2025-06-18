import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { ADMIN_USER_IDS } from '../../lib/constants';

export default function AdminListings() {
  const [listings, setListings] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user || !ADMIN_USER_IDS.includes(user.id)) router.push('/');
    });

    fetchListings();
  }, []);

  const fetchListings = async () => {
    const { data } = await supabase.from('listings').select('*');
    if (data) setListings(data);
  };

  const toggleFlag = async (id: string, current: boolean) => {
    await supabase.from('listings').update({ is_flagged: !current }).eq('id', id);
    fetchListings();
  };

  return (
    <div className="text-white p-8 bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Listings</h1>
      <ul className="space-y-2">
        {listings.map((item) => (
          <li key={item.id} className="border p-4 rounded bg-gray-800">
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-gray-400 mb-2">{item.description}</p>
            <p className="text-xs text-yellow-400 mb-2">Flagged: {item.is_flagged ? 'Yes' : 'No'}</p>
            <button
              onClick={() => toggleFlag(item.id, item.is_flagged)}
              className={`text-sm px-3 py-1 rounded ${
                item.is_flagged ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {item.is_flagged ? 'Unflag' : 'Flag'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

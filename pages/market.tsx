import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import axios from 'axios';

export default function Markets() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('datasets').select('*').eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => setDatasets(data || []));
  }, []);

  const handleBuy = async (datasetId: string) => {
    try {
      setLoading(datasetId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please log in first'); return; }

      const res = await axios.post('/api/checkout_sessions', { datasetId, userId: user.id });
      window.location.href = res.data.url;
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head><title>Markets – Sovrn</title></Head>
      <h1 className="text-3xl font-bold mb-6">Markets</h1>

      {datasets.length === 0 ? <p>No datasets yet.</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map(ds => (
            <div key={ds.id} className="bg-gray-900 p-6 rounded-xl">
              <h3 className="text-xl font-semibold">{ds.name}</h3>
              <p className="text-sm text-gray-400 mb-2">{ds.description}</p>
              {ds.tags?.length ? <p className="text-xs text-gray-400 mb-4">Tags: {ds.tags.join(', ')}</p> : null}
              <p className="text-lg font-bold">Price: ${(ds.unit_price_cents/100).toFixed(2)}</p>
              <div className="flex gap-2 mt-4">
                <Link href={`/dataset/${ds.slug}`} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm">View</Link>
                <button
                  onClick={() => handleBuy(ds.id)}
                  disabled={loading === ds.id}
                  className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
                >
                  {loading === ds.id ? 'Processing…' : 'Buy Access'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

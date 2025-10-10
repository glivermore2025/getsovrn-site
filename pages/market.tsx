// /pages/market.tsx
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

type Dataset = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  unit_price_cents: number;
  is_active: boolean;
  created_at: string;
  contributors_count?: number | null;
};

export default function Markets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setPageLoading(true);
      setErrMsg(null);
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load datasets:', error);
        setErrMsg('Failed to load datasets. Please try again.');
      } else {
        setDatasets((data as Dataset[]) || []);
      }
      setPageLoading(false);
    })();
  }, []);

  const handleBuy = async (datasetId: string) => {
    try {
      setLoadingId(datasetId);
      setErrMsg(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in first.');
        return;
      }

      const res = await axios.post('/api/checkout_sessions', {
        datasetId,
        userId: user.id,
      });

      const url = res?.data?.url;
      if (!url) {
        console.error('No checkout URL returned:', res?.data);
        alert('Checkout could not be started. Please try again.');
        return;
      }

      window.location.href = url;
    } catch (e) {
      console.error('Checkout failed:', e);
      alert('Failed to initiate payment.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head><title>Markets – Sovrn</title></Head>

      <h1 className="text-3xl font-bold mb-6">Markets</h1>

      {pageLoading && <p className="text-gray-400">Loading datasets…</p>}
      {errMsg && <p className="text-red-400 mb-4">{errMsg}</p>}

      {!pageLoading && datasets.length === 0 ? (
        <p>No datasets yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((ds) => (
            <div key={ds.id} className="bg-gray-900 p-6 rounded-xl">
              <h3 className="text-xl font-semibold">{ds.name}</h3>
              {ds.description && (
                <p className="text-sm text-gray-400 mb-2">{ds.description}</p>
              )}
              {ds.tags?.length ? (
                <p className="text-xs text-gray-400 mb-2">
                  Tags: {ds.tags.join(', ')}
                </p>
              ) : null}
              {typeof ds.contributors_count === 'number' && (
                <p className="text-xs text-gray-400 mb-2">
                  Contributors: {ds.contributors_count}
                </p>
              )}
              <p className="text-lg font-bold">
                Price: ${(ds.unit_price_cents / 100).toFixed(2)}
              </p>

              <div className="flex gap-2 mt-4">
                <Link
                  href={`/dataset/${ds.slug}`}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
                >
                  View
                </Link>
                <button
                  onClick={() => handleBuy(ds.id)}
                  disabled={loadingId === ds.id}
                  className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm disabled:opacity-60"
                >
                  {loadingId === ds.id ? 'Processing…' : 'Buy Access'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

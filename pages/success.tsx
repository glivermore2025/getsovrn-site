// /pages/success.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import { getSupabaseClient } from '../lib/supabaseClient';

type SessionPayload =
  | {
      sessionType: 'dataset';
      dataset: {
        id: string;
        slug?: string | null;
        name: string;
        description?: string | null;
        unit_price_cents?: number | null;
      };
    }
  | {
      sessionType: 'listing';
      listing: {
        id: string;
        title: string;
        description?: string | null;
        file_path?: string | null;
        price?: number | null;
      };
    };

export default function SuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<SessionPayload | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!session_id) return;
    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        // Expect your /api/session/[id] to return { sessionType: 'dataset'|'listing', dataset|listing: {...} }
        const { data } = await axios.get(`/api/session/${session_id}`);
        setPayload(data as SessionPayload);
      } catch (e) {
        console.error('Failed to fetch session details:', e);
        setErrMsg('Could not fetch purchase details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [session_id]);

  const handleDownloadListing = async (filePath?: string | null) => {
    if (!filePath) {
      alert('No downloadable file found for this listing.');
      return;
    }
    setDownloading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to download this file.');
        return;
      }

      const { data, error } = await supabase
        .storage
        .from('datasets')
        .createSignedUrl(filePath, 60);

      if (error || !data?.signedUrl) {
        console.error('Signed URL error:', error);
        alert('Failed to generate download link.');
        return;
      }

      window.open(data.signedUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleGoToDataset = (slug?: string | null) => {
    if (!slug) {
      // Fallback to markets if slug is not available
      router.push('/market');
      return;
    }
    router.push(`/dataset/${slug}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Success – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Purchase Successful</h1>

      {loading ? (
        <p>Loading…</p>
      ) : errMsg ? (
        <p className="text-red-400">{errMsg}</p>
      ) : !payload ? (
        <p className="text-red-400">No details available for this session.</p>
      ) : payload.sessionType === 'dataset' ? (
        <div className="bg-gray-800 p-6 rounded shadow-md max-w-md">
          <h2 className="text-xl font-semibold mb-2">
            {payload.dataset.name}
          </h2>
          {payload.dataset.description && (
            <p className="text-gray-300 mb-4">{payload.dataset.description}</p>
          )}
          <button
            onClick={() => handleGoToDataset(payload.dataset.slug)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium"
          >
            Go to Dataset
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded shadow-md max-w-md">
          <h2 className="text-xl font-semibold mb-2">
            {payload.listing.title}
          </h2>
          {payload.listing.description && (
            <p className="text-gray-300 mb-4">{payload.listing.description}</p>
          )}
          <button
            onClick={() => handleDownloadListing(payload.listing.file_path)}
            disabled={downloading}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium disabled:opacity-60"
          >
            {downloading ? 'Preparing…' : 'Download Your Data'}
          </button>
        </div>
      )}
    </div>
  );
}

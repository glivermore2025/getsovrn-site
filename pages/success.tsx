// /pages/success.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import axios from 'axios';

export default function SuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session_id) fetchListing();
  }, [session_id]);

  const fetchListing = async () => {
    try {
      const { data } = await axios.get(`/api/session/${session_id}`);
      setListing(data.listing);
    } catch (err: any) {
      console.error(err);
      setError('Could not fetch purchase details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const { data, error } = await supabase
      .storage
      .from('datasets')
      .createSignedUrl(listing.file_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      alert('Download failed.');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Success – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Purchase Successful</h1>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <div className="bg-gray-800 p-6 rounded shadow-md max-w-md">
          <h2 className="text-xl font-semibold mb-2">{listing.title}</h2>
          <p className="text-gray-300 mb-4">{listing.description}</p>
          <button
            onClick={handleDownload}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium"
          >
            Download Your Data
          </button>
        </div>
      )}
    </div>
  );
}

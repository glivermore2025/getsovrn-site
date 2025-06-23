import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse';

export default function ListingDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (id) fetchListingById(id as string);
  }, [id]);

  const fetchListingById = async (listingId: string) => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (!error) setListing(data);
    setLoading(false);
  };

  const handlePreview = async () => {
    if (!listing?.file_path) return;

    const { data, error } = await supabase.storage.from('datasets').download(listing.file_path);
    if (error || !data) return alert('Failed to load file.');

    const text = await data.text();
    const parsed = Papa.parse(text, { header: true });

    setPreviewData({
      file: listing.file_path,
      rows: parsed.data.length,
      columns: parsed.meta.fields?.length || 0,
      headers: parsed.meta.fields || [],
    });
    setShowModal(true);
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  if (!listing) return <div className="p-8 text-white">Listing not found.</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>{listing.title} – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-4">{listing.title}</h1>
      <p className="mb-2 text-gray-400">{listing.description}</p>
      <p className="mb-2 text-sm">Price: ${listing.price.toFixed(2)}</p>
      <p className="mb-6 text-sm text-gray-400">Tags: {listing.tags?.join(', ')}</p>

      <div className="space-x-4">
        <button
          onClick={handlePreview}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Preview Data
        </button>
        <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
          Buy Data
        </button>
      </div>

      {showModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Data Preview</h3>
            <p className="text-sm mb-1">File: {previewData.file}</p>
            <p className="text-sm mb-1">Columns: {previewData.columns}</p>
            <p className="text-sm mb-1">Rows: {previewData.rows}</p>
            <p className="text-sm mb-2">Headers: {previewData.headers.join(', ')}</p>
            <button
              onClick={() => setShowModal(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

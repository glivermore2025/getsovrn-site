// /pages/listing/[id].tsx

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { fetchListingById } from '../../utils/fetchListings';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse';

export default function ListingDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadListing(id);
    }
  }, [id]);

  const loadListing = async (listingId: string) => {
    setLoading(true);
    const data = await fetchListingById(listingId);
    setListing(data);
    setLoading(false);
  };

  const handlePreview = async (path: string) => {
    const { data, error } = await supabase.storage.from('datasets').download(path);
    if (error || !data) return alert('Failed to load file.');

    const text = await data.text();
    const parsed = Papa.parse(text, { header: true });

    setPreviewData({
      file: path,
      rows: parsed.data.length,
      columns: parsed.meta.fields?.length || 0,
      headers: parsed.meta.fields || [],
    });
    setShowModal(true);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-white p-8">Loading...</div>;
  }

  if (!listing) {
    return <div className="min-h-screen bg-gray-950 text-white p-8">Listing not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>{listing.title} – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-4">{listing.title}</h1>
      <p className="text-gray-400 mb-4">{listing.description}</p>
      <p className="mb-2 text-sm text-gray-300">Price: ${listing.price.toFixed(2)}</p>
      <p className="mb-4 text-sm text-gray-400">Tags: {listing.tags.join(', ')}</p>

      <button
        onClick={() => handlePreview(listing.file_path)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Preview Data
      </button>

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

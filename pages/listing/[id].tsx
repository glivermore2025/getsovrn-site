import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse';
import axios from 'axios';
import { useAuth } from '../../lib/authContext'; // Added

export default function ListingDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth(); // Added

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [buying, setBuying] = useState(false);

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

  const handleBuyNow = async () => {
    try {
      setBuying(true);
      const res = await axios.post('/api/checkout_sessions', { listingId: listing.id });
      window.location.href = res.data.url;
    } catch (err) {
      alert('Failed to initiate checkout.');
      console.error(err);
    } finally {
      setBuying(false);
    }
  };

  const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this listing?')) return;

  // 1. Check if there are purchases for this listing
  const { data: purchases, error: purchaseError } = await supabase
    .from('purchases')
    .select('id')
    .eq('listing_id', listing.id);

  if (purchaseError) {
    console.error('Error checking purchases:', purchaseError);
    alert('Failed to verify purchases. Try again.');
    return;
  }

  if (purchases && purchases.length > 0) {
    alert('This listing cannot be deleted because it has already been purchased.');
    return;
  }

  // 2. Delete the record (only if no purchases exist)
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listing.id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Delete error:', error);
    alert('Failed to delete listing.');
    return;
  }

  // 3. Remove file from storage
  const { error: fileError } = await supabase.storage
    .from('datasets')
    .remove([listing.file_path]);

  if (fileError) {
    console.warn(`File not removed from storage: ${fileError.message}`);
  }

  alert('Listing deleted.');
  router.push('/dashboard');
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
        <button
          onClick={handleBuyNow}
          disabled={buying}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
        >
          {buying ? 'Processing...' : 'Buy Now'}
        </button>

        {user && user.id === listing.user_id && (
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Delete Listing
          </button>
        )}
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

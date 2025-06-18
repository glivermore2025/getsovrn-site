import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import axios from 'axios';

export default function Marketplace() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    const { data, error } = await supabase
  .from('listings')
  .select('*')
  .eq('is_flagged', false)
  .order('created_at', { ascending: false });

    if (!error) setListings(data || []);
  };

  const handlePurchase = async (listingId: string) => {
    setLoading(listingId);
    try {
      const res = await axios.post('/api/checkout_sessions', { listingId });
      window.location.href = `https://checkout.stripe.com/pay/${res.data.id}`;
    } catch (err) {
      alert('Failed to initiate payment.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Marketplace – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Marketplace</h1>

      {listings.length === 0 ? (
        <p>No listings available yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-gray-900 p-4 rounded">
              <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{listing.description}</p>
              <p className="text-sm text-gray-300 mb-2">${listing.price.toFixed(2)}</p>
              <p className="text-sm text-gray-400 mb-2">Tags: {listing.tags?.join(', ')}</p>

              <div className="flex space-x-2">
                <Link href={`/listing/${listing.id}`}>
                  <span className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
                    View Details
                  </span>
                </Link>

                <button
                  onClick={() => handlePurchase(listing.id)}
                  disabled={loading === listing.id}
                  className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  {loading === listing.id ? 'Processing...' : 'Buy Data'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

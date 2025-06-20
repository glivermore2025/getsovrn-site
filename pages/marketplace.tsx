import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import axios from 'axios';

export default function Marketplace() {
  const [listings, setListings] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterAndSort();
  }, [search, tag, sort, listings]);

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_flagged', false)
      .order('created_at', { ascending: false });

    if (!error) setListings(data || []);
  };

  const filterAndSort = () => {
    let result = [...listings];

    if (search) {
      result = result.filter((l) =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (tag !== 'all') {
      result = result.filter((l) => l.tags?.includes(tag));
    }

    if (sort === 'price_low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_high') {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFiltered(result);
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

  const uniqueTags = Array.from(new Set(listings.flatMap((l) => l.tags || [])));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
      <Head>
        <title>Marketplace – Sovrn</title>
      </Head>

      <h1 className="text-4xl font-bold mb-8 text-center">Data Marketplace</h1>

      <div className="flex flex-wrap gap-4 justify-center mb-10">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search listings..."
          className="px-4 py-2 rounded bg-gray-800 border border-gray-700 w-full sm:w-64"
        />

        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="px-4 py-2 rounded bg-gray-800 border border-gray-700"
        >
          <option value="all">All Tags</option>
          {uniqueTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-4 py-2 rounded bg-gray-800 border border-gray-700"
        >
          <option value="newest">Newest</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 mt-20">No listings found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((listing) => (
            <div key={listing.id} className="bg-gray-900 p-6 rounded-xl shadow hover:shadow-blue-700/30 transition">
              <h3 className="text-2xl font-semibold mb-2 text-white">{listing.title}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-3">{listing.description}</p>
              <p className="text-lg font-bold text-green-400 mb-2">${listing.price.toFixed(2)}</p>
              {listing.tags?.length > 0 && (
                <p className="text-sm text-gray-300 mb-4">
                  Tags: <span className="text-blue-400">{listing.tags.join(', ')}</span>
                </p>
              )}

             <div className="flex justify-center gap-2 mt-4">
                <Link href={`/listing/${listing.id}`}>
                  <span className="flex-1 text-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
                    View Details
                  </span>
                </Link>

                <button
                  onClick={() => handlePurchase(listing.id)}
                  disabled={loading === listing.id}
                  className="flex-1 text-center bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium"
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

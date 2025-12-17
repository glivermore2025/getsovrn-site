import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient'; 
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Marketplace() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [listings, setListings] = useState<any[]>([]);
  const [buyerPosts, setBuyerPosts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState('newest');
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [optInLoading, setOptInLoading] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchListings();
    fetchBuyerPosts();
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

  const fetchBuyerPosts = async () => {
    const { data, error } = await supabase
      .from('buyer_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setBuyerPosts(data || []);
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
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    setFiltered(result);
  };

  const handlePurchase = async (listingId: string) => {
    setLoading(listingId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to purchase.');
        return;
      }

      const res = await axios.post('/api/checkout_sessions', {
        listingId,
        userId: user.id,
      });

      window.location.href = res.data.url;
    } catch (err) {
      console.error('Checkout failed:', err);
      alert('Failed to initiate payment.');
    } finally {
      setLoading(null);
    }
  };

  const handleOptIn = async (postId: string) => {
    setOptInLoading(postId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to opt in.');
        return;
      }

      // Check if already opted in
      const { data: existing } = await supabase
        .from('buyer_post_optins')
        .select('id')
        .eq('buyer_post_id', postId)
        .eq('user_id', user.id);

      if (existing && existing.length > 0) {
        alert('You have already opted in to this request.');
        return;
      }

      const { error } = await supabase.from('buyer_post_optins').insert([
        {
          buyer_post_id: postId,
          user_id: user.id,
        },
      ]);

      if (error) {
        console.error('Error opting in:', error);
        alert('Failed to opt-in.');
      } else {
        // Redirect back to Sell tab after success
        router.push('/marketplace?refresh=true#sell');
      }
    } catch (err) {
      console.error('Error during opt-in:', err);
      alert('An error occurred while opting in.');
    } finally {
      setOptInLoading(null);
    }
  };

  const uniqueTags = Array.from(new Set(listings.flatMap((l) => l.tags || [])));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
      <Head>
        <title>Marketplace – Sovrn</title>
      </Head>

      <h1 className="text-4xl font-bold mb-8 text-center">Data Marketplace</h1>

      {/* Tabs */}
      <div className="flex justify-center mb-8 space-x-4">
        <button
          onClick={() => setActiveTab('buy')}
          className={`px-4 py-2 rounded ${
            activeTab === 'buy'
              ? 'bg-blue-600'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Buy Data
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`px-4 py-2 rounded ${
            activeTab === 'sell'
              ? 'bg-blue-600'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Sell Data
        </button>
      </div>

      {activeTab === 'buy' && (
        <>
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
                <option key={t} value={t}>
                  {t}
                </option>
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
                <div
                  key={listing.id}
                  className="bg-gray-900 p-6 rounded-xl shadow hover:shadow-blue-700/30 transition"
                >
                  <h3 className="text-2xl font-semibold mb-2 text-white">
                    {listing.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                    {listing.description}
                  </p>
                  <p className="text-lg font-bold text-green-400 mb-2">
                    ${listing.price.toFixed(2)}
                  </p>
                  {listing.tags?.length > 0 && (
                    <p className="text-sm text-gray-300 mb-4">
                      Tags:{' '}
                      <span className="text-blue-400">
                        {listing.tags.join(', ')}
                      </span>
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
        </>
      )}

      {activeTab === 'sell' && (
        <>
          <div className="flex justify-center mb-8">
            <Link
              href="/buyer_posts/new"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Create Buyer Post
            </Link>
          </div>

          {buyerPosts.length === 0 ? (
            <p className="text-center text-gray-400 mt-20">
              No buyer posts found.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {buyerPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gray-900 p-6 rounded-xl shadow hover:shadow-blue-700/30 transition"
                >
                  <h3 className="text-2xl font-semibold mb-2 text-white">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                    {post.description}
                  </p>
                  <p className="text-lg font-bold text-green-400 mb-2">
                    Budget: ${post.budget.toFixed(2)}
                  </p>
                  {post.tags?.length > 0 && (
                    <p className="text-sm text-gray-300 mb-4">
                      Tags:{' '}
                      <span className="text-blue-400">
                        {post.tags.join(', ')}
                      </span>
                    </p>
                  )}

                  <div className="flex justify-center gap-2 mt-4">
                    <Link href={`/buyer_posts/${post.id}`}>
                      <span className="flex-1 text-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
                        View Details
                      </span>
                    </Link>
                    <button
                      onClick={() => handleOptIn(post.id)}
                      disabled={optInLoading === post.id}
                      className="flex-1 text-center bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {optInLoading === post.id ? 'Opting in...' : 'Opt-in'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

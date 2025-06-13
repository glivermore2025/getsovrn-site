// /pages/dashboard.tsx

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user);
      if (data?.user) fetchListings(data.user.id);
    });
  }, []);

  const fetchListings = async (userId: string) => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error) setListings(data || []);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!file || !user) {
      setError('Please upload a file and make sure you are logged in.');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('datasets')
      .upload(fileName, file);

    if (uploadError) {
      setError('File upload failed.');
      return;
    }

    const { error: insertError } = await supabase.from('listings').insert([
      {
        user_id: user.id,
        title,
        description,
        price: parseFloat(price),
        tags: tags.split(',').map((t) => t.trim()),
        file_path: fileName,
      },
    ]);

    if (insertError) {
      setError('Failed to save listing.');
      return;
    }

    setTitle('');
    setDescription('');
    setPrice('');
    setTags('');
    setFile(null);
    setError('');
    fetchListings(user.id);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Seller Dashboard – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Seller Dashboard</h1>

      {!user ? (
        <p className="text-red-400">You must be logged in to create listings.</p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded-md mb-10">
            <h2 className="text-xl font-semibold mb-4">Create New Listing</h2>

            <input
              type="text"
              placeholder="Title"
              className="w-full p-2 rounded bg-gray-800"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <textarea
              placeholder="Description"
              className="w-full p-2 rounded bg-gray-800"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              type="text"
              placeholder="Tags (comma-separated)"
              className="w-full p-2 rounded bg-gray-800"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            <input
              type="number"
              placeholder="Price (USD)"
              className="w-full p-2 rounded bg-gray-800"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />

            <input
              type="file"
              className="w-full p-2 rounded bg-gray-800"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />

            <button type="submit" className="bg-blue-600 py-2 px-4 rounded w-full">
              Submit Listing
            </button>

            {error && <p className="text-red-400">{error}</p>}
          </form>

          <div>
            <h2 className="text-xl font-semibold mb-4">Your Listings</h2>
            {listings.length === 0 ? (
              <p>No listings yet.</p>
            ) : (
              <ul className="space-y-4">
                {listings.map((listing) => (
                  <li key={listing.id} className="bg-gray-800 p-4 rounded">
                    <h3 className="text-lg font-semibold">{listing.title}</h3>
                    <p className="text-sm text-gray-400">{listing.description}</p>
                    <p className="text-sm text-gray-300">${listing.price.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">Tags: {listing.tags.join(', ')}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

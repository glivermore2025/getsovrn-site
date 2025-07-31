import Head from 'next/head';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { getUserListings } from '../utils/fetchListings';
import { useAuth } from '../lib/authContext';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer'>('seller');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [buyerOptIns, setBuyerOptIns] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch seller listings
  useEffect(() => {
    if (!user) return;
    const fetchListings = async () => {
      const fetched = await getUserListings(user.id);
      setListings(fetched);
    };
    fetchListings();
  }, [user]);

  // Fetch buyer post opt-ins
  useEffect(() => {
    if (!user) return;
    const fetchOptIns = async () => {
      const { data, error } = await supabase
        .from('buyer_post_optins')
        .select(`
          buyer_post_id,
          buyer_posts ( title, description, budget, tags )
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        const cleaned = data.map((optin: any) => ({
          id: optin.buyer_post_id,
          ...optin.buyer_posts,
        }));
        setBuyerOptIns(cleaned);
      }
    };
    fetchOptIns();
  }, [user]);

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
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setError('File upload failed.');
      return;
    }

    const { error: insertError } = await supabase.from('listings').insert([{
      user_id: user.id,
      title,
      description,
      price: parseFloat(price),
      tags: tags.split(',').map((t) => t.trim()),
      file_path: fileName,
    }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      setError('Failed to save listing.');
      return;
    }

    setTitle('');
    setDescription('');
    setPrice('');
    setTags('');
    setFile(null);
    setError('');
    const updatedListings = await getUserListings(user.id);
    setListings(updatedListings);
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

  const handleDelete = async (listingId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    // Check purchases
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id')
      .eq('listing_id', listingId);

    if (purchases && purchases.length > 0) {
      alert('This listing cannot be deleted because purchases exist.');
      return;
    }

    // Remove file
    await supabase.storage.from('datasets').remove([filePath]);

    // Delete listing
    await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)
      .eq('user_id', user.id);

    const updated = await getUserListings(user.id);
    setListings(updated);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head><title>Dashboard – Sovrn</title></Head>

      <h1 className="text-3xl font-bold mb-6">User Dashboard</h1>

      {/* Tabs */}
      <div className="flex mb-8 space-x-4">
        <button
          onClick={() => setActiveTab('seller')}
          className={`px-4 py-2 rounded ${activeTab === 'seller' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          Seller
        </button>
        <button
          onClick={() => setActiveTab('buyer')}
          className={`px-4 py-2 rounded ${activeTab === 'buyer' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          Buyer
        </button>
      </div>

      {authLoading ? (
        <p>Loading...</p>
      ) : !user ? (
        <p className="text-red-400">You must be logged in to view the dashboard.</p>
      ) : activeTab === 'seller' ? (
        // SELLER TAB
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded-md">
            <h2 className="text-xl font-semibold mb-4">Create New Listing</h2>

            <div>
              <label className="block text-sm mb-1">Title</label>
              <input type="text" className="w-full p-2 rounded bg-gray-800" value={title}
                onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea className="w-full p-2 rounded bg-gray-800" value={description}
                onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm mb-1">Tags (comma-separated)</label>
              <input type="text" className="w-full p-2 rounded bg-gray-800" value={tags}
                onChange={(e) => setTags(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm mb-1">Price (USD)</label>
              <input type="number" className="w-full p-2 rounded bg-gray-800" value={price}
                onChange={(e) => setPrice(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm mb-1">Upload File</label>
              <input type="file" className="w-full p-2 rounded bg-gray-800"
                onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </div>

            <button type="submit" className="bg-blue-600 py-2 px-4 rounded w-full">Submit Listing</button>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
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
                    <div className="flex gap-4 mt-2">
                      <button onClick={() => handlePreview(listing.file_path)}
                        className="text-blue-400 underline text-sm">Preview</button>
                      <button onClick={() => handleDelete(listing.id, listing.file_path)}
                        className="text-red-400 underline text-sm">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        // BUYER TAB
        <div>
          <h2 className="text-xl font-semibold mb-4">Buyer Post Opt-ins</h2>
          {buyerOptIns.length === 0 ? (
            <p>No buyer posts opted into yet.</p>
          ) : (
            <ul className="space-y-4">
              {buyerOptIns.map((post) => (
                <li key={post.id} className="bg-gray-800 p-4 rounded">
                  <h3 className="text-lg font-semibold">{post.title}</h3>
                  <p className="text-sm text-gray-400">{post.description}</p>
                  <p className="text-sm text-gray-300">Budget: ${post.budget.toFixed(2)}</p>
                  <p className="text-sm text-gray-400">Tags: {post.tags?.join(', ')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Data Preview</h3>
            <p className="text-sm mb-1">File: {previewData.file}</p>
            <p className="text-sm mb-1">Columns: {previewData.columns}</p>
            <p className="text-sm mb-1">Rows: {previewData.rows}</p>
            <p className="text-sm mb-2">Headers: {previewData.headers.join(', ')}</p>
            <button onClick={() => setShowModal(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

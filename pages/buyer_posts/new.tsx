// pages/buyer_posts/new.tsx
import { useState } from 'react';
import Head from 'next/head';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/authContext';

export default function NewBuyerPost() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const supabase = getSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in.');
      return;
    }

    const { error: insertError } = await supabase.from('buyer_posts').insert([
      {
        user_id: user.id,
        title,
        description,
        budget: parseFloat(budget),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      },
    ]);

    if (insertError) {
      console.error('Insert error:', insertError);
      setError('Failed to create buyer post.');
      return;
    }

    router.push('/marketplace');
  };

  if (loading) return <p className="p-8 text-white">Loading...</p>;
  if (!user) return <p className="p-8 text-white">You must log in to create a post.</p>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head><title>Create Buyer Post – Sovrn</title></Head>

      <h1 className="text-3xl font-bold mb-6">Create Buyer Post</h1>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block mb-1">Title</label>
          <input
            className="w-full p-2 rounded bg-gray-800"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Description</label>
          <textarea
            className="w-full p-2 rounded bg-gray-800"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Budget (USD)</label>
          <input
            type="number"
            className="w-full p-2 rounded bg-gray-800"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Tags (comma separated)</label>
          <input
            className="w-full p-2 rounded bg-gray-800"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="finance, healthcare"
          />
        </div>

        <button type="submit" className="bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded">
          Create Post
        </button>

        {error && <p className="text-red-400">{error}</p>}
      </form>
    </div>
  );
}

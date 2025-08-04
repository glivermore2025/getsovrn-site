import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/authContext';

export default function BuyerPostDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasOptedIn, setHasOptedIn] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPost(id as string);
      checkIfOptedIn(id as string);
    }
  }, [id, user]);

  const fetchPost = async (postId: string) => {
    const { data, error } = await supabase
      .from('buyer_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (!error) setPost(data);
    setLoading(false);
  };

  const checkIfOptedIn = async (postId: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('buyer_post_optins')
      .select('id')
      .eq('buyer_post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setHasOptedIn(true);
    }
  };

  const handleOptIn = async () => {
    if (!user) {
      alert('You must be logged in to opt in.');
      return;
    }

    const { error } = await supabase.from('buyer_post_optins').insert([
      {
        buyer_post_id: id,
        user_id: user.id,
      },
    ]);

    if (error) {
      console.error('Error opting in:', error);
      alert('Failed to opt in.');
      return;
    }

    // Redirect back to marketplace Sell tab to refresh posts
    router.push('/marketplace?refresh=true#sell');
  };

  const handleOptOut = async () => {
    if (!user) return;
    const confirmDelete = confirm('Are you sure you want to opt out of this post?');
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('buyer_post_optins')
      .delete()
      .eq('buyer_post_id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error opting out:', error);
      alert('Failed to opt out.');
      return;
    }

    // Redirect back to marketplace Sell tab to refresh posts
    router.push('/marketplace?refresh=true#sell');
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (!post) return <div className="p-8 text-white">Post not found.</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>{post.title} – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="mb-2 text-gray-400">{post.description}</p>
      <p className="mb-2 text-sm">Budget: ${post.budget.toFixed(2)}</p>
      <p className="mb-6 text-sm text-gray-400">Tags: {post.tags?.join(', ')}</p>

      <div className="space-x-4">
        {hasOptedIn ? (
          <button
            onClick={handleOptOut}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Opt Out
          </button>
        ) : (
          <button
            onClick={handleOptIn}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Opt In
          </button>
        )}
      </div>
    </div>
  );
}

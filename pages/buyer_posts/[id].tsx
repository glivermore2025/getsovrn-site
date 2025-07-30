// pages/buyer_posts/[id].tsx
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function BuyerPostDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchPost(id as string);
  }, [id]);

  const fetchPost = async (postId: string) => {
    const { data, error } = await supabase
      .from('buyer_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (!error) setPost(data);
    setLoading(false);
  };

  const handleOfferData = () => {
    alert('Feature coming soon: submit your dataset offer to the buyer.');
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

      <button
        onClick={handleOfferData}
        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
      >
        Offer Your Data
      </button>
    </div>
  );
}

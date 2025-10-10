import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function DatasetDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const [dataset, setDataset] = useState<any>(null);
  const [isContributor, setIsContributor] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from('datasets').select('*').eq('slug', slug).maybeSingle();
      setDataset(data || null);

      const { data: { user } } = await supabase.auth.getUser();
      if (data && user) {
        const { data: contrib } = await supabase
          .from('dataset_contributions')
          .select('id')
          .eq('dataset_id', data.id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        setIsContributor(!!contrib);
      }
    })();
  }, [slug]);

  const toggleContribution = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please log in'); return; }
      if (!dataset) return;

      if (isContributor) {
        await supabase.from('dataset_contributions')
          .update({ is_active: false })
          .eq('dataset_id', dataset.id)
          .eq('user_id', user.id);
        setIsContributor(false);
      } else {
        await supabase.from('dataset_contributions')
          .upsert({ dataset_id: dataset.id, user_id: user.id, is_active: true, weight: 1 }, { onConflict: 'dataset_id,user_id' });
        setIsContributor(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!dataset) return <div className="p-8 text-white">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head><title>{dataset.name} – Sovrn</title></Head>
      <h1 className="text-3xl font-bold mb-2">{dataset.name}</h1>
      <p className="text-gray-400 mb-4">{dataset.description}</p>
      {dataset.tags?.length ? <p className="text-sm text-gray-500 mb-6">Tags: {dataset.tags.join(', ')}</p> : null}
      <p className="text-xl font-semibold mb-6">Unit Price: ${(dataset.unit_price_cents/100).toFixed(2)}</p>

      <button
        onClick={toggleContribution}
        disabled={loading}
        className={`px-4 py-2 rounded ${isContributor ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
      >
        {loading ? 'Saving…' : isContributor ? 'Stop Contributing' : 'Contribute Data'}
      </button>
    </div>
  );
}

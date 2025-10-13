// /pages/dataset/[slug].tsx
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { supabase } from '../../lib/supabaseClient';

type Dataset = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  unit_price_cents: number;
};

export default function DatasetDetail() {
  const router = useRouter();
  const { slug } = router.query;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [isContributor, setIsContributor] = useState<boolean>(false);
  const [contribBusy, setContribBusy] = useState(false);
  const [buyBusy, setBuyBusy] = useState(false);

  const priceUsd = useMemo(
    () => (dataset ? (dataset.unit_price_cents / 100).toFixed(2) : '0.00'),
    [dataset]
  );

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setPageLoading(true);
      setErrMsg(null);
      try {
        // Load dataset
        const { data, error } = await supabase
          .from('datasets')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (error) throw error;
        setDataset(data as Dataset | null);

        // Check contribution status if logged in and dataset exists
        const { data: auth } = await supabase.auth.getUser();
        if (data && auth?.user) {
          const { data: contrib, error: cErr } = await supabase
            .from('dataset_contributions')
            .select('id, is_active')
            .eq('dataset_id', (data as Dataset).id)
            .eq('user_id', auth.user.id)
            .maybeSingle();

          if (!cErr && contrib?.is_active) {
            setIsContributor(true);
          } else {
            setIsContributor(false);
          }
        } else {
          setIsContributor(false);
        }
      } catch (e: any) {
        console.error('Failed to load dataset:', e);
        setErrMsg('Failed to load this dataset. Please try again.');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [slug]);

  const toggleContribution = async () => {
    if (!dataset) return;
    setContribBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to manage your contribution.');
        return;
      }

      if (isContributor) {
        // Stop contributing (soft deactivate)
        const { error } = await supabase
          .from('dataset_contributions')
          .update({ is_active: false })
          .eq('dataset_id', dataset.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Stop contribution failed:', error);
          alert('Could not stop contributing. Please try again.');
          return;
        }
        setIsContributor(false);
      } else {
        // Start / upsert contribution
        const { error } = await supabase
          .from('dataset_contributions')
          .upsert(
            { dataset_id: dataset.id, user_id: user.id, is_active: true, weight: 1 },
            { onConflict: 'dataset_id,user_id' }
          );

        if (error) {
          console.error('Start contribution failed:', error);
          alert('Could not start contributing. Please try again.');
          return;
        }
        setIsContributor(true);
      }
    } finally {
      setContribBusy(false);
    }
  };

  const handleBuyAccess = async () => {
    if (!dataset) return;
    setBuyBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to purchase access.');
        return;
      }

      // Create Stripe Checkout session for this dataset
      const res = await axios.post('/api/checkout_sessions', {
        datasetId: dataset.id,
        userId: user.id,
      });

      const url = res?.data?.url;
      if (!url) {
        console.error('No checkout URL:', res?.data);
        alert('Checkout could not be started. Please try again.');
        return;
      }

      window.location.href = url;
    } catch (e) {
      console.error('Checkout error:', e);
      alert('Failed to initiate purchase.');
    } finally {
      setBuyBusy(false);
    }
  };

  if (pageLoading) {
    return <div className="p-8 text-white">Loading…</div>;
  }
  if (errMsg || !dataset) {
    return <div className="p-8 text-red-400">{errMsg || 'Dataset not found.'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head><title>{dataset.name} – Sovrn</title></Head>

      <h1 className="text-3xl font-bold mb-2">{dataset.name}</h1>
      {dataset.description && (
        <p className="text-gray-400 mb-4">{dataset.description}</p>
      )}
      {dataset.tags?.length ? (
        <p className="text-sm text-gray-500 mb-4">Tags: {dataset.tags.join(', ')}</p>
      ) : null}

      <p className="text-xl font-semibold mb-6">Unit Price: ${priceUsd}</p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={toggleContribution}
          disabled={contribBusy}
          className={`px-4 py-2 rounded ${
            isContributor ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          } disabled:opacity-60`}
        >
          {contribBusy ? 'Saving…' : isContributor ? 'Stop Contributing' : 'Contribute Data'}
        </button>

        <button
          onClick={handleBuyAccess}
          disabled={buyBusy}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        >
          {buyBusy ? 'Redirecting…' : 'Buy Access'}
        </button>
      </div>
    </div>
  );
}



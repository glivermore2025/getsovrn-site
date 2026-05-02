import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/authContext';
import { DataProduct, DataProductSampleRow } from '../../../lib/types';
import DataQualityPanel from '../../../components/buyer/DataQualityPanel';
import DataProductPreviewTable from '../../../components/buyer/DataProductPreviewTable';

const supabase = getSupabaseClient();

export default function BuyerDatasetDetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [product, setProduct] = useState<DataProduct | null>(null);
  const [samples, setSamples] = useState<DataProductSampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [accessStatus, setAccessStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return;
    loadProduct(slug);
  }, [slug]);

  useEffect(() => {
    if (user && product) {
      loadAccessStatus(user.id, product.id);
    }
  }, [user, product]);

  const loadProduct = async (productSlug: string) => {
    setLoading(true);
    const [{ data: productData, error: productError }, { data: sampleData, error: sampleError }] = await Promise.all([
      supabase
        .from('data_products')
        .select('*')
        .eq('slug', productSlug)
        .maybeSingle(),
      supabase
        .from('buyer_dataset_samples')
        .select('*')
        .eq('data_product_slug', productSlug)
        .order('date', { ascending: false })
        .limit(20),
    ]);

    if (productError) console.error(productError);
    if (sampleError) console.error(sampleError);
    setProduct(productData || null);
    setSamples(sampleData || []);
    setLoading(false);
  };

  const loadAccessStatus = async (buyerId: string, dataProductId: string) => {
    const { data, error } = await supabase
      .from('buyer_access_requests')
      .select('status')
      .eq('buyer_id', buyerId)
      .eq('data_product_id', dataProductId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }
    setAccessStatus(data?.status || null);
  };

  const handleRequestAccess = async () => {
    if (!user || !product) {
      alert('Sign in and return to request access.');
      return;
    }

    setRequesting(true);
    try {
      const { data: existing, error: existingErr } = await supabase
        .from('buyer_access_requests')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('data_product_id', product.id)
        .maybeSingle();

      if (existingErr) {
        throw existingErr;
      }
      if (existing) {
        setAccessStatus('pending');
        alert('You already have a request for this dataset.');
      } else {
        const { error } = await supabase.from('buyer_access_requests').insert([
          {
            buyer_id: user.id,
            data_product_id: product.id,
            status: 'pending',
            requested_use_case: product.buyerUseCase,
            buyer_notes: 'Requesting dataset preview and access for analytics use.',
          },
        ]);

        if (error) throw error;
        setAccessStatus('pending');
        alert('Access request submitted. An admin will review it shortly.');
      }
    } catch (err) {
      console.error(err);
      alert('Could not submit your request.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <Head>
          <title>Dataset not found – Sovrn</title>
        </Head>
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-12 text-center">
          <h1 className="text-3xl font-semibold">Dataset not found</h1>
          <p className="mt-3 text-gray-400">This dataset does not exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>{product.name} – Sovrn</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-blue-400">{product.category}</p>
              <h1 className="mt-3 text-4xl font-bold">{product.name}</h1>
              <p className="mt-4 text-gray-400 max-w-3xl text-lg">{product.description}</p>
              <p className="mt-4 rounded-3xl border border-blue-600 bg-blue-950/20 px-4 py-3 text-sm text-blue-200 max-w-xl">
                Preview data is privacy-safe and aggregated. Buyers cannot access individual-level records from this page.
              </p>
            </div>
            <div className="rounded-3xl bg-gray-800 p-6 text-right space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Price</p>
                <p className="mt-3 text-3xl font-semibold text-white">{product.priceCents != null ? `$${(product.priceCents / 100).toFixed(0)}` : 'Quote'}</p>
              </div>
              <div className="grid gap-3 text-left text-sm text-gray-300">
                <div>
                  <p className="text-gray-400">Pricing model</p>
                  <p>{product.pricingModel.replaceAll('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-gray-400">Privacy</p>
                  <p>{product.privacyLevel}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
              <h2 className="text-2xl font-semibold mb-4">Why this dataset matters</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-gray-950 p-5">
                  <p className="text-sm text-gray-400">Primary use case</p>
                  <p className="mt-2 text-white font-semibold">{product.buyerUseCase}</p>
                </div>
                <div className="rounded-3xl bg-gray-950 p-5">
                  <p className="text-sm text-gray-400">Coverage area</p>
                  <p className="mt-2 text-white font-semibold">{product.coverageArea}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 space-y-4">
              <h2 className="text-2xl font-semibold">Preview sample</h2>
              <DataProductPreviewTable rows={samples} />
            </div>
          </div>

          <div className="space-y-6">
            <DataQualityPanel product={product} />

            <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 space-y-4">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.24em] text-gray-500">Buyer details</p>
                <p className="text-sm text-gray-300">This dataset is curated for enterprise buyers looking for decision-ready local intelligence with strong privacy protection.</p>
              </div>
              <div className="rounded-3xl bg-gray-950 p-5">
                <p className="text-sm text-gray-400">Privacy treatment</p>
                <p className="mt-2 text-white">{product.privacyLevel}. Aggregated only, no individual-level records.</p>
              </div>
              <button
                onClick={handleRequestAccess}
                disabled={requesting || product.status !== 'active'}
                className="w-full rounded-full bg-green-600 hover:bg-green-700 px-5 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {accessStatus ? 'Access requested' : requesting ? 'Requesting…' : 'Request access'}
              </button>
              <a
                href="/buyer/request-custom-dataset"
                className="block text-center rounded-full border border-gray-700 bg-transparent px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Request a custom dataset
              </a>
              {accessStatus && (
                <p className="text-sm text-gray-400">Current request status: {accessStatus}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

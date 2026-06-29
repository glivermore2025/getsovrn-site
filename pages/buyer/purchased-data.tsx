import { useEffect, useState } from 'react';
import Head from 'next/head';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/authContext';

type ListingPurchase = {
  listing_id: string;
  listings: {
    title: string;
    file_path: string | null;
    price?: number | null;
  } | null;
};

type DatasetPurchase = {
  id: string;
  dataset_id: string;
  stripe_session_id: string | null;
  gross_revenue_cents: number;
  currency: string;
  created_at: string;
  datasets: {
    name: string;
    description?: string | null;
    slug?: string | null;
  } | null;
};

type SafeConnectivityRow = {
  dataset_id: string;
  dataset_slug: string;
  purchase_id: string;
  date: string;
  platform: string;
  carrier: string;
  primary_network: string;
  row_count: number;
  contributor_count: number;
  avg_uptime_pct: number | null;
  total_disconnect_count: number;
  first_rollup_at: string;
  last_rollup_at: string;
};

export default function BuyerPurchasedDataPage() {
  const { user, loading: authLoading } = useAuth();
  const [listingPurchases, setListingPurchases] = useState<ListingPurchase[]>([]);
  const [datasetPurchases, setDatasetPurchases] = useState<DatasetPurchase[]>([]);
  const [safeRowsByPurchase, setSafeRowsByPurchase] = useState<Record<string, SafeConnectivityRow[]>>({});
  const [safeRowsLoading, setSafeRowsLoading] = useState<Record<string, boolean>>({});
  const [safeRowsError, setSafeRowsError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPurchases = async () => {
      setLoading(true);
      const [legacyResult, datasetResult] = await Promise.all([
        supabase
          .from('purchases')
          .select(
            `
            listing_id,
            listings (
              title,
              file_path,
              price
            )
          `
          )
          .eq('user_id', user.id),
        supabase
          .from('dataset_purchases')
          .select(
            `
            id,
            dataset_id,
            stripe_session_id,
            gross_revenue_cents,
            currency,
            created_at,
            datasets (
              name,
              description,
              slug
            )
          `
          )
          .eq('buyer_user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false }),
      ]);

      if (legacyResult.error) {
        console.error('Error fetching listing purchases:', legacyResult.error);
      } else {
        setListingPurchases(
          (legacyResult.data || []).map((purchase: any) => ({
            listing_id: purchase.listing_id,
            listings: Array.isArray(purchase.listings)
              ? purchase.listings[0] ?? null
              : purchase.listings,
          }))
        );
      }

      if (datasetResult.error) {
        console.error('Error fetching dataset purchases:', datasetResult.error);
      } else {
        setDatasetPurchases(
          (datasetResult.data || []).map((purchase: any) => ({
            ...purchase,
            datasets: Array.isArray(purchase.datasets)
              ? purchase.datasets[0] ?? null
              : purchase.datasets,
          }))
        );
      }

      setLoading(false);
    };

    fetchPurchases();
  }, [supabase, user]);

  const handleDownload = async (filePath: string | null) => {
    if (!filePath) return;

    const { data, error } = await supabase.storage.from('datasets').createSignedUrl(filePath, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      alert('Failed to generate download link.');
      console.error(error);
    }
  };

  const loadSafeConnectivityRows = async (purchaseId: string) => {
    setSafeRowsLoading((prev) => ({ ...prev, [purchaseId]: true }));
    setSafeRowsError((prev) => ({ ...prev, [purchaseId]: '' }));

    const { data, error } = await supabase.rpc('get_purchased_connectivity_daily', {
      p_purchase_id: purchaseId,
      p_limit: 10000,
      p_offset: 0,
    });

    setSafeRowsLoading((prev) => ({ ...prev, [purchaseId]: false }));

    if (error) {
      console.error('Safe dataset pull failed:', error);
      setSafeRowsError((prev) => ({
        ...prev,
        [purchaseId]: error.message || 'Failed to pull safe dataset rows.',
      }));
      return;
    }

    setSafeRowsByPurchase((prev) => ({
      ...prev,
      [purchaseId]: (data || []) as SafeConnectivityRow[],
    }));
  };

  const downloadSafeRows = (purchase: DatasetPurchase) => {
    const rows = safeRowsByPurchase[purchase.id] || [];
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = purchase.datasets?.slug || 'dataset';
    a.href = url;
    a.download = `sovrn-${slug}-${purchase.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasPurchases = datasetPurchases.length > 0 || listingPurchases.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Purchased Data - Sovrn</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Purchased Data</h1>
          <p className="mt-2 text-gray-400">
            Review purchased data products, query receipts, and downloadable legacy files.
          </p>
        </header>

        {authLoading || loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
          </div>
        ) : !user ? (
          <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900 p-12 text-center text-gray-400">
            <p className="text-lg font-semibold text-white">Sign in to view your purchased datasets.</p>
            <p className="mt-3">Visit the buyer dashboard or marketplace to request access to new data products.</p>
            <a href="/buyer/data-purchasing" className="mt-6 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Preview Live Dataset
            </a>
          </div>
        ) : !hasPurchases ? (
          <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900 p-12 text-center text-gray-400">
            <p className="text-lg font-semibold text-white">No purchases found.</p>
            <p className="mt-3">Purchased data products and approved exports will appear here.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="/buyer/data-purchasing" className="inline-flex rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700">
                Purchase Live Data
              </a>
              <a href="/buyer/marketplace" className="inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                Browse Marketplace
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {datasetPurchases.length > 0 ? (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Data products</h2>
                <ul className="space-y-4">
                  {datasetPurchases.map((purchase) => {
                    const safeRows = safeRowsByPurchase[purchase.id] || [];
                    const isConnectivity = purchase.datasets?.slug === 'connectivity';
                    const isLoadingRows = safeRowsLoading[purchase.id] || false;
                    const rowError = safeRowsError[purchase.id];

                    return (
                      <li key={purchase.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{purchase.datasets?.name || 'Dataset purchase'}</h3>
                            {purchase.datasets?.description ? (
                              <p className="mt-2 text-sm text-gray-400">{purchase.datasets.description}</p>
                            ) : null}
                            <p className="mt-3 text-xs text-gray-500">
                              Session {purchase.stripe_session_id || 'pending'} - purchased{' '}
                              {new Date(purchase.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="rounded-xl bg-gray-950 px-4 py-3 text-right">
                            <p className="text-sm text-gray-400">Amount paid</p>
                            <p className="text-lg font-semibold">
                              {(purchase.currency || 'usd').toUpperCase()}{' '}
                              {(purchase.gross_revenue_cents / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-gray-950 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Export</p>
                            {isConnectivity ? (
                              <div className="mt-3 space-y-3">
                                <button
                                  type="button"
                                  onClick={() => loadSafeConnectivityRows(purchase.id)}
                                  disabled={isLoadingRows}
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                  {isLoadingRows ? 'Loading...' : 'Load safe export'}
                                </button>
                                {safeRows.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => downloadSafeRows(purchase)}
                                    className="ml-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-blue-400 hover:text-blue-300"
                                  >
                                    Download JSON
                                  </button>
                                ) : null}
                                {rowError ? <p className="text-sm text-red-400">{rowError}</p> : null}
                                <p className="text-sm text-gray-300">
                                  {safeRows.length > 0
                                    ? `${safeRows.length} aggregated rows ready`
                                    : 'Pulls only buyer-safe aggregated rows.'}
                                </p>
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-gray-300">Export coming soon</p>
                            )}
                          </div>
                          <div className="rounded-xl bg-gray-950 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">API access</p>
                            <p className="mt-2 text-sm text-gray-300">
                              {isConnectivity
                                ? 'RPC: get_purchased_connectivity_daily'
                                : 'Coming soon'}
                            </p>
                          </div>
                          <div className="rounded-xl bg-gray-950 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">License</p>
                            <p className="mt-2 text-sm text-gray-300">Standard dataset terms</p>
                          </div>
                        </div>
                        {isConnectivity ? (
                          <a href="/buyer/data-purchasing" className="mt-4 inline-flex rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-white hover:border-blue-400 hover:text-blue-300">
                            Open connectivity purchase flow
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {listingPurchases.length > 0 ? (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Legacy listing downloads</h2>
                <ul className="space-y-4">
                  {listingPurchases.map((purchase, index) => (
                    <li key={`${purchase.listing_id}-${index}`} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                      <h3 className="text-lg font-semibold">{purchase.listings?.title || 'Untitled'}</h3>
                      {purchase.listings?.price != null ? (
                        <p className="text-sm text-gray-400 mb-2">Price: ${purchase.listings.price.toFixed(2)}</p>
                      ) : null}
                      {purchase.listings?.file_path ? (
                        <button
                          onClick={() => handleDownload(purchase.listings?.file_path ?? null)}
                          className="mt-2 inline-block text-blue-400 underline"
                        >
                          Download file
                        </button>
                      ) : (
                        <p className="text-sm text-red-400">No file available</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

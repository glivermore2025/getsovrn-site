import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/authContext';
import { BuyerAccessRequest, CustomDatasetRequest } from '../../lib/types';

const supabase = getSupabaseClient();

export default function BuyerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<BuyerAccessRequest[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomDatasetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadRequests(user.id);
  }, [user]);

  const loadRequests = async (buyerId: string) => {
    setLoading(true);
    const [accessResult, customResult] = await Promise.all([
      supabase
        .from('buyer_access_requests')
        .select('*, data_products(*)')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('custom_dataset_requests')
        .select('*')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false }),
    ]);

    if (accessResult.error) {
      console.error('Failed to load buyer requests', accessResult.error);
      setRequests([]);
    } else {
      setRequests((accessResult.data || []).map((item: any) => ({ ...item, data_products: item.data_products })));
    }

    if (customResult.error) {
      console.error('Failed to load custom dataset requests', customResult.error);
      setCustomRequests([]);
    } else {
      setCustomRequests((customResult.data || []) as CustomDatasetRequest[]);
    }

    setLoading(false);
  };

  const allStatuses = [
    ...requests.map((request) => request.status),
    ...customRequests.map((request) => request.status === 'new' ? 'pending' : request.status),
  ];

  const statusCounts = allStatuses.reduce(
    (acc, request) => {
      acc[request] = (acc[request] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const hasAnyRequests = requests.length > 0 || customRequests.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <Head>
        <title>Buyer Dashboard - Sovrn</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-6">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <h1 className="text-4xl font-bold">Buyer Dashboard</h1>
          <p className="mt-3 text-gray-400 text-lg">
            Track your dataset requests, see approved access, and manage the datasets you have requested from Sovrn.
          </p>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Next steps</h2>
              <p className="mt-3 text-gray-400 max-w-2xl">
                Continue the buyer journey with live purchasing, the curated marketplace, or a custom dataset request if you need tailored coverage.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="/buyer/data-purchasing" className="rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700">
                Purchase Live Data
              </a>
              <a href="/buyer/marketplace" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                Browse Marketplace
              </a>
              <a href="/buyer/request-custom-dataset" className="rounded-full border border-gray-700 bg-transparent px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800">
                Request Custom Dataset
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {['pending', 'approved', 'rejected', 'active'].map((status) => (
            <div key={status} className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-gray-500">{status}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{statusCounts[status] || 0}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold">Dataset access requests</h2>
            <p className="text-sm text-gray-400">Requests are reviewed by Sovrn admin and approved manually.</p>
          </div>

          {authLoading || loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
            </div>
          ) : !user ? (
            <p className="text-gray-400">Sign in to view your buyer activity.</p>
          ) : !hasAnyRequests ? (
            <div className="rounded-3xl border border-dashed border-gray-800 p-12 text-center text-gray-400">
              No dataset access requests yet. Browse the buyer marketplace or request a custom dataset.
            </div>
          ) : (
            <div className="space-y-4">
              {customRequests.map((request) => (
                <div key={request.id} className="rounded-3xl border border-blue-500/30 bg-blue-950/20 p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-blue-300">Custom request - {request.status}</p>
                      <h3 className="text-xl font-semibold text-white">{request.data_category} for {request.target_geography}</h3>
                      <p className="mt-2 text-gray-400">{request.use_case}</p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      <p>Requested</p>
                      <p className="mt-1 text-white">{new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Coverage</p>
                      <p className="mt-2 text-sm text-gray-300">{request.target_geography}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Cadence</p>
                      <p className="mt-2 text-sm text-gray-300">{request.refresh_cadence}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Budget</p>
                      <p className="mt-2 text-sm text-gray-300">{request.budget_range || 'Not specified'}</p>
                    </div>
                  </div>

                  {request.admin_notes ? (
                    <div className="mt-5 rounded-2xl border border-gray-800 bg-gray-950 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Admin notes</p>
                      <p className="mt-2 text-sm text-gray-300">{request.admin_notes}</p>
                    </div>
                  ) : null}
                </div>
              ))}

              {requests.map((request) => (
                <div key={request.id} className="rounded-3xl border border-gray-800 bg-gray-950 p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">{request.status}</p>
                      <h3 className="text-xl font-semibold text-white">{request.data_products?.name || 'Unknown dataset'}</h3>
                      <p className="mt-2 text-gray-400">{request.data_products?.buyerUseCase}</p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      <p>Requested</p>
                      <p className="mt-1 text-white">{new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Use case</p>
                      <p className="mt-2 text-sm text-gray-300">{request.requested_use_case || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Notes</p>
                      <p className="mt-2 text-sm text-gray-300">{request.buyer_notes || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Product</p>
                      <p className="mt-2 text-sm text-gray-300">{request.data_products?.name ?? 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

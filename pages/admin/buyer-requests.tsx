import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { getCurrentUserIsAdmin } from '../../lib/roleAccess';
import { useRouter } from 'next/router';
import { BuyerAccessRequest, DataProduct } from '../../lib/types';
import BuyerAccessRequestTable from '../../components/admin/BuyerAccessRequestTable';

const supabase = getSupabaseClient();

export default function AdminBuyerRequests() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<BuyerAccessRequest[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, DataProduct>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data?.user;
      setUser(u);
      if (!u || !(await getCurrentUserIsAdmin())) {
        router.push('/');
      }
    });
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('buyer_access_requests')
      .select('*, data_products(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load buyer requests', error);
      setRequests([]);
      setProductsMap({});
    } else {
      const loaded = (data || []).map((item: any) => item as BuyerAccessRequest & { data_products?: DataProduct });
      setRequests(loaded);
      const map: Record<string, DataProduct> = {};
      loaded.forEach((item) => {
        if (item.data_products) {
          map[item.data_product_id] = item.data_products;
        }
      });
      setProductsMap(map);
    }
    setLoading(false);
  };

  const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setActionLoadingId(requestId);
    const { error } = await supabase
      .from('buyer_access_requests')
      .update({ status: action, updated_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) {
      console.error('Failed to update request status', error);
      alert('Unable to update request status.');
    } else {
      await loadRequests();
    }
    setActionLoadingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Admin Buyer Requests – Sovrn</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Admin — Buyer Requests</h1>
          <p className="mt-2 text-gray-400">Review dataset access requests and approve or reject buyer inquiries.</p>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-400">Loading requests…</div>
        ) : (
          <BuyerAccessRequestTable
            requests={requests}
            products={productsMap}
            onAction={handleAction}
            loadingId={actionLoadingId}
          />
        )}
      </div>
    </div>
  );
}

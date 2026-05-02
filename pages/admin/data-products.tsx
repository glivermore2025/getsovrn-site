import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { ADMIN_USER_IDS } from '../../lib/constants';
import { useRouter } from 'next/router';
import { DataProduct } from '../../lib/types';
import DataProductEditor from '../../components/admin/DataProductEditor';

const supabase = getSupabaseClient();

export default function AdminDataProducts() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<DataProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setUser(u);
      if (!u || !ADMIN_USER_IDS.includes(u.id)) {
        router.push('/');
      }
    });
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('data_products')
      .select('*');
    if (error) {
      console.error('Unable to load products', error);
      setProducts([]);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleSave = async (payload: Partial<DataProduct> & { id?: string }) => {
    if (!payload.name || !payload.slug || !payload.description) {
      alert('Please complete the product name, slug, and description.');
      return;
    }

    setSaving(true);
    try {
      const mutation = payload.id
        ? supabase.from('data_products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', payload.id)
        : supabase.from('data_products').insert([{ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);

      const { error } = await mutation;
      if (error) {
        throw error;
      }
      setSelectedProduct(null);
      await loadProducts();
    } catch (err) {
      console.error('Save failed', err);
      alert('Could not save the data product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Admin Data Products – Sovrn</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Admin — Data Products</h1>
          <p className="mt-2 text-gray-400">Create, update, and publish buyer-facing dataset products for the Sovrn marketplace.</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Products</h2>
                  <p className="text-gray-400 text-sm">{products.length} available products.</p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold"
                >
                  + New product
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-400">Loading products…</div>
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-400">No products found.</div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="w-full rounded-3xl border border-gray-800 bg-gray-900 p-5 text-left hover:border-blue-500"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">{product.name}</p>
                        <p className="text-sm text-gray-400">{product.category} · {product.geography}</p>
                      </div>
                      <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">{product.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <DataProductEditor
              product={selectedProduct ?? undefined}
              onSave={handleSave}
              loading={saving}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

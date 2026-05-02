import { useEffect, useState } from 'react';
import Head from 'next/head';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/authContext';

interface Listing {
  title: string;
  file_path: string;
  price?: number;
}

interface Purchase {
  listing_id: string;
  listings: Listing;
}

export default function BuyerPurchasedDataPage() {
  const { user, loading: authLoading } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPurchases = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          listing_id,
          listings (
            title,
            file_path,
            price
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching purchases:', error);
      } else {
        const cleaned = (data || []).map((p: any) => ({
          listing_id: p.listing_id,
          listings: Array.isArray(p.listings) ? p.listings[0] : p.listings,
        }));
        setPurchases(cleaned);
      }

      setLoading(false);
    };

    fetchPurchases();
  }, [supabase, user]);

  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('datasets').createSignedUrl(filePath, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      alert('Failed to generate download link.');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Purchased Data – Sovrn</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Purchased Data</h1>
          <p className="mt-2 text-gray-400">
            Review your purchased dataset exports and download any available files.
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
          </div>
        ) : purchases.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900 p-12 text-center text-gray-400">
            <p className="text-lg font-semibold text-white">No purchases found.</p>
            <p className="mt-3">Once your access requests are approved, approved exports will appear here.</p>
            <a href="/buyer/marketplace" className="mt-6 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Browse Marketplace
            </a>
          </div>
        ) : (
          <ul className="space-y-4">
            {purchases.map((purchase, i) => (
              <li key={i} className="bg-gray-800 p-4 rounded">
                <h3 className="text-lg font-semibold">{purchase.listings?.title || 'Untitled'}</h3>
                {purchase.listings?.price != null ? (
                  <p className="text-sm text-gray-400 mb-2">Price: ${purchase.listings.price.toFixed(2)}</p>
                ) : null}
                {purchase.listings?.file_path ? (
                  <button
                    onClick={() => handleDownload(purchase.listings.file_path)}
                    className="text-blue-400 underline mt-2 inline-block"
                  >
                    Download File
                  </button>
                ) : (
                  <p className="text-sm text-red-400">No file available</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

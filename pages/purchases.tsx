// /pages/purchases.tsx
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

interface Purchase {
  listing_id: string;
  listings: {
    title: string;
    file_path: string;
    price?: number;
  };
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchases = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User not authenticated:', userError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('purchases')
        .select('listing_id, listings (title, file_path, price)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching purchases:', error);
      } else if (data) {
        // Validate that listings is a single object, not an array
        const normalized = data.map((p) => ({
          listing_id: p.listing_id,
          listings: {
            title: p.listings.title,
            file_path: p.listings.file_path,
            price: p.listings.price,
          }
        }));
        setPurchases(normalized);
      }

      setLoading(false);
    };

    fetchPurchases();
  }, []);

  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase
      .storage
      .from('datasets')
      .createSignedUrl(filePath, 60);

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
        <title>My Purchases – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">My Purchased Data</h1>

      {loading ? (
        <p>Loading purchases...</p>
      ) : purchases.length === 0 ? (
        <p>No purchases found.</p>
      ) : (
        <ul className="space-y-4">
          {purchases.map((purchase, i) => (
            <li key={i} className="bg-gray-800 p-4 rounded">
              <h3 className="text-lg font-semibold">{purchase.listings.title}</h3>
              {purchase.listings.price && (
                <p className="text-sm text-gray-400 mb-2">
                  Price: ${purchase.listings.price.toFixed(2)}
                </p>
              )}
              <button
                onClick={() => handleDownload(purchase.listings.file_path)}
                className="text-blue-400 underline mt-2 inline-block"
              >
                Download File
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

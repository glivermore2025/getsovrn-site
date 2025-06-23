// /pages/purchases.tsx
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { user } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const { data: purchases, error } = await supabase
    .from('purchases')
    .select('listing_id, listings (title, file_path)')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching purchases:', error);
    return { props: { purchases: [] } };
  }

  return {
    props: {
      purchases,
    },
  };
};

export default function PurchasesPage({ purchases }: { purchases: any[] }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>My Purchases – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">My Purchased Data</h1>

      {purchases.length === 0 ? (
        <p>No purchases found.</p>
      ) : (
        <ul className="space-y-4">
          {purchases.map((purchase, i) => (
            <li key={i} className="bg-gray-800 p-4 rounded">
              <h3 className="text-lg font-semibold">{purchase.listings.title}</h3>
              <a
                href={`https://lxyozudlxyclpelnavkn.supabase.co/storage/v1/object/public/datasets/${purchase.listings.file_path}`}
                download
                className="text-blue-400 underline mt-2 inline-block"
              >
                Download File
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

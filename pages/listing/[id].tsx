// /pages/listing/[id].tsx

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ListingPage() {
  const router = useRouter();
  const { id } = router.query;

  const [listing, setListing] = useState<any>(null);

  useEffect(() => {
    if (id) fetchListing(id as string);
  }, [id]);

  const fetchListing = async (listingId: string) => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (!error) setListing(data);
  };

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <Head><title>Loading – Sovrn</title></Head>
        <p>Loading listing details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head><title>{listing.title} – Sovrn</title></Head>

      <h1 className="text-3xl font-bold mb-4">{listing.title}</h1>

      <p className="text-gray-400 mb-6">{listing.description}</p>

      <p className="text-lg mb-2">Price: <strong>${listing.price.toFixed(2)}</strong></p>

      <p className="text-gray-300 mb-4">Tags: {listing.tags.join(', ')}</p>

      <a
        href={listing.file_path ? supabase.storage.from('datasets').getPublicUrl(listing.file_path).data.publicUrl : '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-blue-600 px-6 py-3 rounded text-white hover:bg-blue-700"
      >
        View Sample Data
      </a>
    </div>
  );
}

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ConnectivityRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/buyer/data-purchasing');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center">
        <h1 className="text-3xl font-bold">Redirecting to Buyer Portal…</h1>
        <p className="mt-4 text-gray-400">
          You are being redirected to the new Data Purchasing page. If the redirect does not happen automatically,
          <a href="/buyer/data-purchasing" className="text-blue-400 underline ml-1">
            click here
          </a>.
        </p>
      </div>
    </div>
  );
}

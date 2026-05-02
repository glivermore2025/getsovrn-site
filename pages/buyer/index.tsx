import Head from 'next/head';
import Link from 'next/link';

export default function BuyerPortalPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Buyer Portal – Sovrn</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-8">
        <header className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <h1 className="text-4xl font-bold">Buyer Portal</h1>
          <p className="mt-3 text-gray-400 max-w-3xl text-lg">
            Access Sovrn&apos;s curated data marketplace, preview safe aggregated datasets, and track buyer access requests.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <Link href="/buyer/marketplace" className="rounded-3xl border border-gray-800 bg-gray-900 p-8 transition hover:border-blue-500 hover:bg-gray-800">
            <h2 className="text-2xl font-semibold">Marketplace</h2>
            <p className="mt-3 text-gray-400">Browse curated data products with buyer-focused coverage, quality, and pricing summaries.</p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-400 font-semibold">Explore marketplace →</div>
          </Link>

          <Link href="/buyer/dashboard" className="rounded-3xl border border-gray-800 bg-gray-900 p-8 transition hover:border-blue-500 hover:bg-gray-800">
            <h2 className="text-2xl font-semibold">Buyer Dashboard</h2>
            <p className="mt-3 text-gray-400">Review your access requests, approved datasets, and buyer activity in one place.</p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-400 font-semibold">View dashboard →</div>
          </Link>

          <Link href="/buyer/purchased-data" className="rounded-3xl border border-gray-800 bg-gray-900 p-8 transition hover:border-blue-500 hover:bg-gray-800">
            <h2 className="text-2xl font-semibold">Purchased Data</h2>
            <p className="mt-3 text-gray-400">Download available dataset exports and review the data you have purchased.</p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-400 font-semibold">Manage purchases →</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

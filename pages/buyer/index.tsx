import Head from 'next/head';
import Link from 'next/link';

export default function BuyerPortalPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Buyer Portal - Sovrn</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8">
        <header className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <h1 className="text-4xl font-bold">Buyer Portal</h1>
          <p className="mt-3 text-gray-400 max-w-3xl text-lg">
            Access Sovrn&apos;s curated data marketplace, preview safe aggregated datasets, purchase live data products, and track buyer activity.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/buyer/marketplace" className="rounded-3xl border border-gray-800 bg-gray-900 p-8 transition hover:border-blue-500 hover:bg-gray-800">
            <h2 className="text-2xl font-semibold">Marketplace</h2>
            <p className="mt-3 text-gray-400">Browse live data products with buyer-focused coverage, quality, and pricing summaries.</p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-400 font-semibold">Explore marketplace -&gt;</div>
          </Link>

          <Link href="/buyer/data-purchasing" className="rounded-3xl border border-blue-700 bg-blue-950/30 p-8 transition hover:border-blue-400 hover:bg-blue-950/60">
            <p className="text-xs uppercase tracking-[0.24em] text-blue-300">Live</p>
            <h2 className="mt-3 text-2xl font-semibold">Purchase Data</h2>
            <p className="mt-3 text-gray-300">Filter, preview, price, and buy the active connectivity dataset from one guided workflow.</p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-300 font-semibold">Open purchase flow -&gt;</div>
          </Link>

          <Link href="/buyer/dashboard" className="rounded-3xl border border-gray-800 bg-gray-900 p-8 transition hover:border-blue-500 hover:bg-gray-800">
            <h2 className="text-2xl font-semibold">Buyer Dashboard</h2>
            <p className="mt-3 text-gray-400">Review your access requests, approved datasets, and buyer activity in one place.</p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-400 font-semibold">View dashboard -&gt;</div>
          </Link>

          <Link href="/buyer/purchased-data" className="rounded-3xl border border-gray-800 bg-gray-900 p-8 transition hover:border-blue-500 hover:bg-gray-800">
            <h2 className="text-2xl font-semibold">Purchased Data</h2>
            <p className="mt-3 text-gray-400">Download available dataset exports and review the data you have purchased.</p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-400 font-semibold">Manage purchases -&gt;</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

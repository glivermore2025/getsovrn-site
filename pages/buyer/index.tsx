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
          <h1 className="text-4xl font-bold">Buyer&apos;s Portal</h1>
          <p className="mt-3 text-gray-400 max-w-3xl text-lg">
            Access the Data Purchasing workflow, review purchased datasets, and manage your buyer activity in one place.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/buyer/data-purchasing" className="rounded-3xl border border-gray-800 bg-gray-900 p-8 transition hover:border-blue-500 hover:bg-gray-800">
            <h2 className="text-2xl font-semibold">Data Purchasing</h2>
            <p className="mt-3 text-gray-400">
              Browse available dataset previews, apply filters, and purchase the exact dataset slice you need.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-400 font-semibold">
              Go to Data Purchasing →
            </div>
          </Link>

          <Link href="/buyer/purchased-data" className="rounded-3xl border border-gray-800 bg-gray-900 p-8 transition hover:border-blue-500 hover:bg-gray-800">
            <h2 className="text-2xl font-semibold">Purchased Data</h2>
            <p className="mt-3 text-gray-400">
              Review your completed purchases and download any available dataset exports.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-400 font-semibold">
              View Purchased Data →
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

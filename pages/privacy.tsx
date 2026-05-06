import Head from 'next/head';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-16">
      <Head>
        <title>Privacy & Consent – Sovrn</title>
        <meta
          name="description"
          content="Learn how Sovrn collects, protects, and anonymizes contributor data while giving buyers access to consent-backed aggregated datasets."
        />
      </Head>

      <main className="max-w-6xl mx-auto space-y-10">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-10 shadow-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Privacy & Consent</p>
          <h1 className="mt-4 text-5xl font-bold">Simple, transparent data control for contributors and buyers.</h1>
          <p className="mt-6 text-lg text-gray-300 leading-8">
            Sovrn is built for privacy-first data exchange. Contributors decide what data they share, and buyers receive only aggregated, consent-backed datasets.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link href="/for-consumers" className="inline-flex items-center justify-center rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition">
              Learn about selling data
            </Link>
            <Link href="/buyer/marketplace" className="inline-flex items-center justify-center rounded-full border border-gray-700 bg-transparent px-6 py-3 text-sm font-semibold text-white hover:border-blue-400 hover:text-blue-300 transition">
              Browse datasets
            </Link>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8">
            <h2 className="text-3xl font-semibold">What data is collected</h2>
            <p className="mt-4 text-gray-300 leading-7">
              Sovrn collects only consented signals that contributors choose to share. That can include device context, connectivity, location trends, or usage categories depending on the data source.
            </p>
            <ul className="mt-6 space-y-4 text-gray-300">
              <li>Explicitly opted-in data categories only</li>
              <li>Aggregated and anonymized before buyer preview</li>
              <li>No raw personal identifiers in marketplace exports</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8">
            <h2 className="text-3xl font-semibold">What is never collected</h2>
            <p className="mt-4 text-gray-300 leading-7">
              Sovrn is designed to exclude sensitive personal data from buyer products and public previews.
            </p>
            <ul className="mt-6 space-y-4 text-gray-300">
              <li>Individual-level GPS or raw location trails</li>
              <li>Names, email addresses, or personal identifiers</li>
              <li>Transaction details tied to a single person</li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-10">
          <h2 className="text-3xl font-semibold">How data is anonymized and aggregated</h2>
          <div className="mt-6 space-y-6 text-gray-300 leading-7">
            <p>
              Before any dataset reaches a buyer, Sovrn packages it into aggregated summaries with privacy-safe thresholds. This means buyers can analyze trends without accessing raw contributor records.
            </p>
            <p>
              Dataset previews show masked or sampled rows so that buyers can validate product shape and use cases without seeing personal details.
            </p>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8">
            <h2 className="text-3xl font-semibold">How buyers request access</h2>
            <p className="mt-4 text-gray-300 leading-7">
              Buyers request access for specific datasets through Sovrn. Each request is reviewed before any export or approved dataset is shared.
            </p>
            <ul className="mt-6 space-y-4 text-gray-300">
              <li>Buyers request dataset access, not raw data</li>
              <li>Access is approved manually during the pilot phase</li>
              <li>Marketplace previews are privacy-safe samples</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8">
            <h2 className="text-3xl font-semibold">How contributors opt in and out</h2>
            <p className="mt-4 text-gray-300 leading-7">
              Contributor control is central. You decide which categories are available and can revoke consent or remove your data from the marketplace at any time.
            </p>
            <ul className="mt-6 space-y-4 text-gray-300">
              <li>Set consent preferences from your dashboard</li>
              <li>Toggle marketplace participation for each category</li>
              <li>Stop sharing data whenever you choose</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8">
            <h2 className="text-3xl font-semibold">How payouts work</h2>
            <p className="mt-4 text-gray-300 leading-7">
              Contributors earn when their consented data creates value in buyer datasets. Estimated value appears after the first sync and depends on category, region, freshness, and buyer demand.
            </p>
          </div>
          <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8">
            <h2 className="text-3xl font-semibold">How deletion and revocation work</h2>
            <p className="mt-4 text-gray-300 leading-7">
              If you leave the marketplace or delete your data, Sovrn removes your records from new dataset construction and prevents future sharing. Existing buyer products remain aggregated and privacy-safe.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Trust first</p>
          <h2 className="mt-4 text-3xl font-bold">Your data stays under your control.</h2>
          <p className="mt-4 max-w-3xl mx-auto text-gray-300 leading-7">
            Sovrn gives contributors a transparent, privacy-conscious path to earn while buyers get the clarity they need to evaluate consent-backed datasets.
          </p>
        </section>
      </main>
    </div>
  );
}

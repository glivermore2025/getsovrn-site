import Head from 'next/head';
import WaitlistForm from '../components/WaitlistForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black text-white">
      <Head>
        <title>Sovrn – Own Your Data</title>
        <meta name="description" content="Monetize your personal data on Sovrn Marketplace." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <section className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Sovrn Marketplace</p>
            <h1 className="mt-4 text-5xl md:text-6xl font-extrabold leading-tight">
              A consent-based data marketplace for buyers and contributors.
            </h1>
            <p className="mt-6 text-lg text-gray-400 max-w-2xl">
              Buy aggregated, privacy-safe datasets built from opt-in consumer contributions. Earn from your data while staying in control of how it is shared.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <a href="/for-consumers" className="inline-flex items-center justify-center rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white hover:bg-green-700 transition">
                For Consumers
              </a>
              <a href="/for-buyers" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">
                For Buyers
              </a>
              <a href="/buyer/marketplace" className="inline-flex items-center justify-center rounded-full bg-gray-800 px-8 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition">
                Browse Data Products
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Featured pilot product</p>
            <h2 className="mt-4 text-3xl font-semibold">Device Connectivity Insights — Houston</h2>
            <p className="mt-4 text-gray-400">
              Aggregated connectivity quality, download speed, and device presence by ZIP code. Designed for retailers, operators, and planners who need privacy-first local signals.
            </p>
            <div className="mt-6 space-y-3 text-gray-300 text-sm">
              <p><span className="font-semibold text-white">Category:</span> Device & Connectivity</p>
              <p><span className="font-semibold text-white">Aggregation:</span> ZIP code / daily</p>
              <p><span className="font-semibold text-white">Privacy:</span> Consent-based, aggregated, no individual device records</p>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-xl font-semibold">For Buyers</h2>
            <p className="mt-4 text-gray-400">Access curated local datasets with preview-safe aggregated samples and request straightforward access or custom reports.</p>
          </div>
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-xl font-semibold">For Consumers</h2>
            <p className="mt-4 text-gray-400">Share data only when you consent, and earn when aggregated insights are created from your contribution.</p>
          </div>
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-xl font-semibold">Privacy-first design</h2>
            <p className="mt-4 text-gray-400">We only surface aggregated insights to buyers and never expose raw personal data in the marketplace.</p>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-2xl font-semibold">Why Sovrn?</h2>
            <ul className="mt-6 space-y-3 text-gray-300 list-disc list-inside">
              <li>Consent-based data collection and buyer access.</li>
              <li>Aggregated previews with no raw personal records.</li>
              <li>Buyer-focused product discovery and request workflows.</li>
              <li>Consumer control, transparency, and earnings potential.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-2xl font-semibold">Pilot ready</h2>
            <p className="mt-4 text-gray-400">This marketplace is entering pilot mode with strong buyer vetting, privacy-reviewed product previews, and responsive support for custom dataset needs.</p>
          </div>
        </section>

        <section className="bg-gray-900 rounded-3xl border border-gray-800 p-8 mt-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Join the pilot</h2>
              <p className="mt-3 text-gray-400">Whether you are a buyer or a consumer contributor, start with our tailored onboarding pages.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a href="/for-buyers" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">For Buyers</a>
              <a href="/for-consumers" className="rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition">For Consumers</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center text-gray-500 text-sm py-10 border-t border-gray-800">
        &copy; {new Date().getFullYear()} Sovrn. All rights reserved.
      </footer>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm py-10 border-t border-gray-800">
        &copy; {new Date().getFullYear()} Sovrn. All rights reserved.
      </footer>
    </div>
  );
}

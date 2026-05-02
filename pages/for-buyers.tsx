import Head from 'next/head';
import Link from 'next/link';

export default function ForBuyersPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Head>
        <title>For Buyers – Sovrn</title>
        <meta
          name="description"
          content="Buy privacy-safe, decision-ready local data products from consented contributors."
        />
      </Head>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-14">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-10 shadow-xl">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-blue-400">For Buyers</p>
              <h1 className="mt-4 text-5xl font-bold leading-tight">Buy privacy-safe local data products for better decisions.</h1>
              <p className="mt-6 text-lg text-gray-400 max-w-2xl">
                GetSovrn connects business buyers with consented, aggregated local insights in mobility, connectivity, and consumer pulse.
                Browse curated datasets, preview safe aggregated samples, and request access to the products that support your next market move.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/buyer/marketplace" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">
                  Explore Marketplace
                </Link>
                <Link href="/buyer/request-custom-dataset" className="inline-flex items-center justify-center rounded-full bg-gray-800 px-8 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition">
                  Request Custom Dataset
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8">
              <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Featured product</p>
              <h2 className="mt-4 text-2xl font-semibold text-white">Houston Connectivity Quality Index</h2>
              <p className="mt-3 text-gray-400">
                Aggregated device connectivity signals across the Houston metro area, showing network type, signal quality, and device context by ZIP code and day.
              </p>
              <div className="mt-6 grid gap-3 text-sm text-gray-300">
                <p><span className="font-semibold text-white">Use case:</span> Network quality analysis, infrastructure planning, local market research.</p>
                <p><span className="font-semibold text-white">Coverage:</span> Houston Metro</p>
                <p><span className="font-semibold text-white">Aggregation:</span> ZIP-code daily</p>
                <p><span className="font-semibold text-white">Privacy:</span> Aggregated only, no individual-level records.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-2xl font-semibold">What can I buy?</h2>
            <p className="mt-4 text-gray-400 leading-relaxed">
              GetSovrn offers decision-ready data products built from consumer opt-in data, aggregated for privacy and designed for local market intelligence.
            </p>
            <ul className="mt-6 space-y-3 text-gray-300">
              <li>Retail site selection and customer demand planning</li>
              <li>Event and foot traffic forecasting</li>
              <li>Network quality and connectivity coverage analysis</li>
              <li>Consumer sentiment and preference pulse signals</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-2xl font-semibold">How privacy is handled</h2>
            <p className="mt-4 text-gray-400 leading-relaxed">
              All data products are built from consented participant contributions. We use aggregation and privacy-safe sampling to remove individual-level records before buyers can preview or request access.
            </p>
            <div className="mt-6 space-y-3 text-gray-300">
              <p><span className="font-semibold text-white">Consent-based:</span> data is included only when participants opt in.</p>
              <p><span className="font-semibold text-white">Aggregated:</span> buyer previews show group-level patterns, not raw personal records.</p>
              <p><span className="font-semibold text-white">Pilot phase:</span> access is reviewed manually to protect consumer privacy and responsible use.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: 'Retail site selection',
              description: 'Use local mobility and consumer demand signals to choose strong retail locations.',
            },
            {
              title: 'Network quality analysis',
              description: 'Understand connectivity patterns by ZIP code for infrastructure decisions.',
            },
            {
              title: 'Consumer research',
              description: 'Access opt-in survey and preference signals for product and market testing.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-gray-400">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
          <h2 className="text-2xl font-semibold">Buyer workflow</h2>
          <ol className="mt-6 space-y-4 text-gray-300">
            <li><span className="font-semibold text-white">1.</span> Browse curated data products.</li>
            <li><span className="font-semibold text-white">2.</span> Preview safe aggregated dataset samples.</li>
            <li><span className="font-semibold text-white">3.</span> Request access or a custom dataset.</li>
            <li><span className="font-semibold text-white">4.</span> Receive approved exports or reports.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}

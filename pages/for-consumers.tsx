import Head from 'next/head';
import Link from 'next/link';

export default function ForConsumersPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Head>
        <title>For Consumers – Sovrn</title>
        <meta
          name="description"
          content="Contribute your data on your terms and participate when privacy-safe insights are created."
        />
      </Head>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-14">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-10 shadow-xl">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-blue-400">For Consumers</p>
              <h1 className="mt-4 text-5xl font-bold leading-tight">Contribute your data on your terms.</h1>
              <p className="mt-6 text-lg text-gray-400 max-w-2xl">
                Sovrn helps you stay in control of your data while participating in a privacy-safe marketplace. You decide what you share, see how it is used, and review estimated value when consented contributions support buyer datasets.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white hover:bg-green-700 transition">
                  Create Account
                </Link>
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-gray-800 px-8 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition">
                  View Consumer Dashboard
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-800 bg-gray-950 p-8">
              <p className="text-sm uppercase tracking-[0.3em] text-blue-400">What you control</p>
              <div className="mt-4 space-y-3 text-gray-300">
                <p><span className="font-semibold text-white">Data categories:</span> Device & connectivity, mobility signals, consumer pulse surveys, and preference trends.</p>
                <p><span className="font-semibold text-white">Privacy:</span> Buyers receive aggregated, consent-based insights, not individual records.</p>
                <p><span className="font-semibold text-white">Value:</span> Estimated value depends on demand, quality, and participation.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <ol className="mt-6 space-y-4 text-gray-300">
              <li><span className="font-semibold text-white">1.</span> Create an account.</li>
              <li><span className="font-semibold text-white">2.</span> Choose consent categories.</li>
              <li><span className="font-semibold text-white">3.</span> Sync eligible data and surveys.</li>
              <li><span className="font-semibold text-white">4.</span> Review estimated value when aggregated insights are requested by buyers.</li>
            </ol>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-2xl font-semibold">Consent categories</h2>
            <div className="mt-6 space-y-4 text-gray-300">
              <div className="rounded-2xl bg-gray-950 p-5">
                <p className="font-semibold text-white">Device & Connectivity Data</p>
                <p className="mt-2 text-sm text-gray-400">Network context, signal quality, and device health signals used only in aggregated reports.</p>
              </div>
              <div className="rounded-2xl bg-gray-950 p-5">
                <p className="font-semibold text-white">General Location / Mobility Signals</p>
                <p className="mt-2 text-sm text-gray-400">Aggregated movement and foot traffic patterns by ZIP code—not raw GPS trails.</p>
              </div>
              <div className="rounded-2xl bg-gray-950 p-5">
                <p className="font-semibold text-white">Consumer Pulse Surveys</p>
                <p className="mt-2 text-sm text-gray-400">Opt-in survey signals used for market research and sentiment panels.</p>
              </div>
              <div className="rounded-2xl bg-gray-950 p-5 opacity-60">
                <p className="font-semibold text-white">Future Financial Data</p>
                <p className="mt-2 text-sm text-gray-400">Not currently collected. Will require separate explicit consent when available.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
          <h2 className="text-2xl font-semibold">Value and expectations</h2>
          <p className="mt-4 text-gray-400 leading-relaxed">
            Estimated value depends on buyer demand, data category, data quality, and marketplace participation. GetSovrn shows estimated value as data products become active, but cannot guarantee payouts or buyer access approval.
          </p>
        </section>
      </main>
    </div>
  );
}

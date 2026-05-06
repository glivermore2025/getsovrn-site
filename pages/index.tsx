import Head from 'next/head';
import Link from 'next/link';
import WaitlistForm from '../components/WaitlistForm';
import TrustStrip from '../components/TrustStrip';

const trustPoints = [
  'You control what you share',
  'Buyers request access',
  'Data is packaged for privacy, quality, and transparency',
  'Revoke access anytime',
  'No hidden resale',
];

const howItWorks = [
  'Connect your data',
  'Choose what to share',
  'Sovrn transforms it into buyer-ready datasets',
  'Buyers request access',
  'You earn when your data creates value',
];

const sellerControls = [
  { title: 'Data categories', description: 'Control which data categories you share and keep private.' },
  { title: 'Buyer access', description: 'Buyers request access before any dataset export is shared.' },
  { title: 'Marketplace participation', description: 'Opt in only when you are ready to make contributions available.' },
  { title: 'Payout preferences', description: 'Set how and when you receive earnings from approved data sales.' },
  { title: 'Revocation and deletion', description: 'Leave or remove your data from the marketplace at any time.' },
];

const buyerBenefits = [
  { title: 'Aggregated datasets', description: 'Access decision-ready insights without individual-level records.' },
  { title: 'Transparent coverage', description: 'See region, contributor scale, and use case signals clearly.' },
  { title: 'Freshness indicators', description: 'Choose datasets by latency, refresh cadence, and recent activity.' },
  { title: 'Consent-backed sourcing', description: 'Every product is built from explicit contributor opt-in.' },
  { title: 'Sample previews', description: 'Review privacy-safe sample data before requesting access.' },
  { title: 'Use-case filters', description: 'Search by analytics need, geography, and business intent.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-black text-white">
      <Head>
        <title>GetSovrn – Own your data. Earn from it on your terms.</title>
        <meta
          name="description"
          content="Sovrn helps individuals monetize consented, privacy-protected data while giving buyers access to transparent, high-quality datasets."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-screen-2xl mx-auto px-6 py-16 lg:py-24">
        <section className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-start">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
              Privacy-first data marketplace
            </div>
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">Own your data. Earn from it on your terms.</h1>
              <p className="max-w-2xl text-lg text-gray-300 leading-8">
                Sovrn helps individuals monetize consented, privacy-protected data while giving buyers access to transparent, high-quality datasets.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link href="/for-consumers" className="inline-flex items-center justify-center rounded-full bg-green-600 px-7 py-3 text-sm font-semibold text-white hover:bg-green-700 transition">
                Start Selling Data
              </Link>
              <Link href="/buyer/marketplace" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-7 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">
                Explore Buyer Marketplace
              </Link>
              <Link href="/privacy" className="inline-flex items-center justify-center rounded-full border border-gray-700 bg-transparent px-7 py-3 text-sm font-semibold text-white hover:border-blue-400 hover:text-blue-300 transition">
                See how privacy works
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {trustPoints.map((point) => (
                <div key={point} className="rounded-3xl border border-gray-800 bg-gray-950 p-5 text-sm text-gray-300">
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Featured dataset</p>
            <h2 className="mt-4 text-3xl font-semibold">Houston Connectivity Signals</h2>
            <p className="mt-4 text-gray-400 leading-7">
              Aggregated device and network context from opted-in contributors, packaged for privacy-safe buyer analysis.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-gray-300">
              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="font-semibold text-white">Region</p>
                <p>Houston Metro</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="font-semibold text-white">Refresh</p>
                <p>Daily refresh</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="font-semibold text-white">Privacy</p>
                <p>Aggregated • consent-backed</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="font-semibold text-white">Use cases</p>
                <p>Mobility analytics, network planning, consumer behavior research</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mt-20 space-y-8">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-blue-400">How Sovrn works</p>
            <h2 className="mt-3 text-4xl font-bold">A simple flow for contributors and buyers.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {howItWorks.map((step, idx) => (
              <div key={step} className="rounded-3xl border border-gray-800 bg-gray-950 p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
                  {idx + 1}
                </div>
                <p className="text-sm text-gray-300">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 space-y-8">
          <div>
            <h2 className="text-3xl font-bold">What you control</h2>
            <p className="mt-3 max-w-2xl text-gray-400 leading-7">
              Contributors stay in charge of the data shared, the buyers who request access, and how they participate in the marketplace.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {sellerControls.map((item) => (
              <div key={item.title} className="rounded-3xl border border-gray-800 bg-gray-950 p-6">
                <p className="text-sm uppercase tracking-[0.28em] text-blue-400 mb-3">{item.title}</p>
                <p className="text-gray-300 leading-7">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 space-y-8">
          <div>
            <h2 className="text-3xl font-bold">What buyers get</h2>
            <p className="mt-3 max-w-2xl text-gray-400 leading-7">
              Buyers can discover datasets with clear sourcing, freshness, privacy treatment, and use case alignment.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {buyerBenefits.map((item) => (
              <div key={item.title} className="rounded-3xl border border-gray-800 bg-gray-950 p-6">
                <p className="text-xl font-semibold text-white mb-3">{item.title}</p>
                <p className="text-gray-300 leading-7">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <TrustStrip items={trustPoints} />
        </section>

        <section className="mt-16 rounded-3xl border border-gray-800 bg-gray-900 p-10 shadow-xl">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-start">
            <div>
              <h2 className="text-3xl font-bold">Join the Sovrn waitlist</h2>
              <p className="mt-3 text-gray-400 max-w-xl leading-7">
                Choose your path and we’ll keep you updated as the marketplace grows.
              </p>
            </div>
            <WaitlistForm />
          </div>
        </section>
      </main>
    </div>
  );
}

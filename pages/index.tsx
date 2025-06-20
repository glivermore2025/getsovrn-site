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

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center py-20 px-4">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
          Own Your Data. <span className="text-blue-400">Monetize It.</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl font-light mb-10">
          Sovrn empowers you to take control, upload, and sell your personal data directly to buyers.
        </p>

        {/* Primary CTAs */}
        <div className="space-x-4 mb-10">
          <a href="/marketplace" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Browse Marketplace
          </a>
          <a href="/dashboard" className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition">
            Start Selling
          </a>
        </div>
      </main>

      {/* Waitlist Form Section */}
      <section className="bg-gray-900 py-16 px-4" id="waitlist">
        <div className="max-w-md mx-auto">
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm py-10 border-t border-gray-800">
        &copy; {new Date().getFullYear()} Sovrn. All rights reserved.
      </footer>
    </div>
  );
}

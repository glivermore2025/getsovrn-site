import Head from 'next/head';
import WaitlistForm from '../components/WaitlistForm';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Sovrn – Own Your Data</title>
        <meta name="description" content="Monetize your personal data on Sovrn Marketplace." />
      </Head>

      <div className="text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Own Your Data. <span className="text-blue-400">Monetize It.</span>
        </h2>
        <p className="text-lg text-gray-300 mb-10">
          Sovrn empowers you to take control, upload, and sell your personal data directly to buyers.
        </p>

        <div className="space-x-4 mb-10">
          <a href="/marketplace" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700">
            Browse Marketplace
          </a>
          <a href="/dashboard" className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700">
            Start Selling
          </a>
        </div>

        <div className="max-w-md mx-auto">
          <WaitlistForm />
        </div>
      </div>
      </div>
  );
}

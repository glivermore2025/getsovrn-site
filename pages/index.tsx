import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <Head>
        <title>Sovrn – Own Your Data</title>
        <meta name="description" content="Monetize your personal data on Sovrn Marketplace." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="flex justify-between items-center mb-16">
        <h1 className="text-3xl font-bold">SOVRN</h1>
            <div className="flex items-center space-x-3">
          <Image src="/logo.png" alt="SOVRN Logo" width={200} height={200} />
          
          
        </div>
        <nav className="space-x-6 text-sm">
          <Link href="/marketplace" className="hover:text-blue-400">Marketplace</Link>
          <Link href="/dashboard" className="hover:text-blue-400">Seller Dashboard</Link>
          <Link href="/success" className="hover:text-blue-400">Success Page</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Own Your Data. <span className="text-blue-400">Monetize It.</span>
        </h2>
        <p className="text-lg text-gray-300 mb-10">
          Sovrn empowers you to take control, upload, and sell your personal data directly to buyers.
        </p>

        <div className="space-x-4">
          <Link href="/marketplace">
            <span className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 cursor-pointer">
              Browse Marketplace
            </span>
          </Link>

          <Link href="/dashboard">
            <span className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 cursor-pointer">
              Start Selling
            </span>
          </Link>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          Interested in joining? <a href="#waitlist" className="underline">Join the Waitlist</a>
        </p>
      </main>

      <footer className="text-center text-gray-500 text-sm py-10 mt-20 border-t border-gray-800">
        &copy; {new Date().getFullYear()} Sovrn. All rights reserved.
      </footer>
    </div>
  );
}

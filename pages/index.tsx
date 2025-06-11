import Head from 'next/head';
import Image from 'next/image';
import WaitlistForm from '../components/WaitlistForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white font-sans">
      <Head>
        <title>SOVRN – Data Trading Platform</title>
        <meta name="description" content="Sell your personal data like a commodity. Empower your privacy." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="flex items-center justify-between p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <Image src="/logo.png" alt="SOVRN Logo" width={80} height={80} />
          <h1 className="text-xl font-bold tracking-wide">SOVRN</h1>
        </div>
        <nav className="space-x-6 text-sm">
          <a href="#about" className="hover:text-blue-400">About</a>
          <a href="#waitlist" className="hover:text-blue-400">Join Waitlist</a>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Own Your Data. <span className="text-blue-400">Monetize It.</span>
        </h2>
        <p className="text-lg text-gray-300 mb-10">
          GetSovrn empowers you to control, compile, and sell your data directly to interested buyers.
        </p>
        <a
          href="#waitlist"
          className="inline-block px-6 py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition"
        >
          Join the Waitlist
        </a>
      </main>

      <section className="bg-gray-800 py-16 px-6" id="waitlist">
        <div className="max-w-md mx-auto">
          <WaitlistForm />
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-20" id="about">
        <h3 className="text-2xl font-semibold mb-4">How It Works</h3>
        <p className="text-gray-400 mb-6">
          SOVRN gives you full control over your data. Decide what to share, with whom, and at what price. It's like turning your browsing habits, app usage, or location history into real value — directly from your device.
        </p>
        <ul className="space-y-3 text-gray-300 list-disc list-inside">
          <li>Create a secure data vault</li>
          <li>Choose the data you want to sell</li>
          <li>Set your price and get paid</li>
        </ul>
      </section>

      {/* Honeypot spam trap */}
      <div style={{ display: 'none' }}>
        <label htmlFor="nickname">Nickname</label>
        <input
          type="text"
          name="nickname"
          id="nickname"
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <footer className="text-center text-gray-500 text-sm py-10 border-t border-gray-800">
        &copy; {new Date().getFullYear()} SOVRN. All rights reserved.
      </footer>
    </div>
  );
}

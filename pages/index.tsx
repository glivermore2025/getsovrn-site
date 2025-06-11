import Head from 'next/head';
import WaitlistForm from '@/components/WaitlistForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <Head>
        <title>GetSovrn</title>
        <meta name="description" content="Take control of your data. Get paid for what’s yours." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center flex-1">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Own Your Data. <span className="text-blue-600">Monetize It.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-xl mb-8">
          GetSovrn empowers you to control, compile, and sell your data directly to interested buyers.
        </p>
        <a
          href="#"
          className="px-6 py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition"
        >
          Join the Waitlist
        </a>
         <div className="max-w-md w-full">
        <WaitlistForm />
      </div>
      </main>

      <footer className="w-full py-6 border-t text-sm text-gray-500 mt-10">
        © {new Date().getFullYear()} GetSovrn. All rights reserved.
      </footer>
    </div>

 
    
  );
}

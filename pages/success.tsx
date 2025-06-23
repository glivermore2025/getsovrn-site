// /pages/success.tsx
import Head from 'next/head';
import Link from 'next/link';

export default function Success() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <Head>
        <title>Purchase Successful – Sovrn</title>
      </Head>
      <h1 className="text-3xl font-bold mb-4">Thank you for your purchase!</h1>
      <p className="mb-6 text-gray-300 text-center max-w-md">
        Your payment has been received and your data will be available shortly.
      </p>
      <Link href="/marketplace">
        <span className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-white cursor-pointer">
          Back to Marketplace
        </span>
      </Link>
    </div>
  );
}

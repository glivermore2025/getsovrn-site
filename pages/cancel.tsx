// /pages/cancel.tsx
import Head from 'next/head';
import Link from 'next/link';

export default function Cancel() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <Head>
        <title>Purchase Cancelled – Sovrn</title>
      </Head>
      <h1 className="text-3xl font-bold mb-4">Purchase Cancelled</h1>
      <p className="mb-6 text-gray-300 text-center max-w-md">
        Something went wrong or you cancelled the payment process. You can try again anytime.
      </p>
      <Link href="/marketplace">
        <span className="bg-gray-700 hover:bg-gray-800 px-6 py-2 rounded text-white cursor-pointer">
          Return to Marketplace
        </span>
      </Link>
    </div>
  );
}

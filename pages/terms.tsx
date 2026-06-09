import Head from 'next/head';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-16">
      <Head>
        <title>Terms of Service - Sovrn</title>
        <meta
          name="description"
          content="Sovrn Terms of Service for mobile app users, contributors, and buyers."
        />
      </Head>

      <main className="mx-auto max-w-4xl space-y-8">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Terms of Service</p>
          <h1 className="mt-4 text-4xl font-bold">Sovrn terms for contributors and buyers.</h1>
          <p className="mt-5 text-gray-300 leading-7">
            These terms describe the pilot Sovrn experience. By using Sovrn, you agree to use the app and marketplace lawfully, provide accurate account information, and manage your own consent settings.
          </p>
        </section>

        <section className="space-y-6 text-gray-300 leading-7">
          <div>
            <h2 className="text-2xl font-semibold text-white">Contributor Controls</h2>
            <p className="mt-3">
              Contributors choose which modules may be collected and which modules may be included in aggregated marketplace insights. You can update consent settings, revoke participation, delete module data, or delete your account.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Marketplace Pilot</h2>
            <p className="mt-3">
              Buyer access, estimated values, and payout-related features may change during the pilot. Sovrn does not guarantee earnings, buyer demand, dataset availability, or approval of any specific marketplace request.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Privacy</h2>
            <p className="mt-3">
              Our privacy practices, data categories, retention details, and deletion options are described in the <Link href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Contact</h2>
            <p className="mt-3">
              Questions about these terms can be sent to <a href="mailto:support@getsovrn.com" className="text-blue-400 hover:text-blue-300">support@getsovrn.com</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

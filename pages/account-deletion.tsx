import Head from 'next/head';
import Link from 'next/link';

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-950 px-6 py-16 text-white">
      <Head>
        <title>Delete Your Account - Sovrn</title>
        <meta
          name="description"
          content="How to delete your Sovrn account and contributed data."
        />
      </Head>

      <main className="mx-auto max-w-3xl space-y-8">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
            Account deletion
          </p>
          <h1 className="mt-3 text-4xl font-bold">Delete your Sovrn account</h1>
          <p className="mt-4 text-gray-300 leading-7">
            You can permanently delete your Sovrn account from the mobile app or
            request deletion through the web. Deletion removes your profile,
            module permissions, consent preferences, registered devices, and
            contributed device events from future marketplace use.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <h2 className="text-2xl font-semibold">Delete from the mobile app</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-gray-300">
            <li>Open Sovrn and sign in.</li>
            <li>Go to Profile.</li>
            <li>Tap Delete Account in the Danger Zone.</li>
            <li>Confirm deletion.</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <h2 className="text-2xl font-semibold">Delete from the web</h2>
          <p className="mt-4 text-gray-300 leading-7">
            Sign in on the web dashboard, then contact support from the same
            email address if you need help completing deletion.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700"
            >
              Sign In
            </Link>
            <a
              href="mailto:support@getsovrn.com?subject=Sovrn%20account%20deletion"
              className="inline-flex justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:border-blue-400 hover:text-blue-300"
            >
              Email Support
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <h2 className="text-2xl font-semibold">Retention</h2>
          <p className="mt-4 text-gray-300 leading-7">
            Account deletion removes raw contributed records from Sovrn systems.
            Previously generated buyer products may remain only as aggregated,
            privacy-safe summaries that do not identify individual contributors.
          </p>
        </section>
      </main>
    </div>
  );
}

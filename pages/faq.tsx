import Head from 'next/head';
import Link from 'next/link';

type FaqItem = {
  question: string;
  answer: string;
};

const howToItems: FaqItem[] = [
  {
    question: 'How do I access data after I purchase a Sovrn dataset?',
    answer:
      'Sign in to your buyer account, open Buyer Portal, then choose Purchased Data. Your completed purchases appear there with available export and API access options.',
  },
  {
    question: 'How do I download a purchased dataset as JSON?',
    answer:
      'On the Purchased Data page, open the purchased data product, choose Load safe export, then choose Download JSON after the aggregated rows load. The downloaded file contains buyer-safe rows for the dataset you purchased.',
  },
  {
    question: 'How do I connect to purchased data through the API?',
    answer:
      'For connectivity data, authenticated buyers can use the get_purchased_connectivity_daily access path shown on the Purchased Data page. The API returns only aggregated rows tied to your completed purchase, not raw contributor records.',
  },
  {
    question: 'How do I preview data before buying?',
    answer:
      'Open Buyer Portal, choose the live data purchase flow, adjust filters such as date range, platform, carrier, network type, uptime, and disconnect counts, then refresh the preview before purchasing.',
  },
  {
    question: 'How do I request a dataset that is not listed yet?',
    answer:
      'Use the Request Custom Dataset option in the Buyer Portal. Sovrn can review whether the requested data can be produced from consented contributor signals while maintaining privacy-safe aggregation.',
  },
];

const buyerItems: FaqItem[] = [
  {
    question: 'What is Sovrn?',
    answer:
      'Sovrn is a consent-based data marketplace that helps contributors control participation while giving buyers access to privacy-safe, aggregated data products.',
  },
  {
    question: 'What kind of data can buyers purchase on Sovrn?',
    answer:
      'Sovrn focuses on decision-ready datasets built from opt-in contributor signals, including connectivity quality, device context, local activity patterns, and future consumer pulse datasets.',
  },
  {
    question: 'Is Sovrn selling personal data?',
    answer:
      'No. Buyer products are designed around aggregated, privacy-safe summaries. Buyers should not receive raw personal records, precise individual histories, or direct contributor identifiers.',
  },
  {
    question: 'What does buyer-safe data mean?',
    answer:
      'Buyer-safe data means Sovrn transforms consented contributor signals into aggregated cohorts, summaries, or derived metrics before making them visible for preview or purchase.',
  },
  {
    question: 'Can a buyer see who contributed to a dataset?',
    answer:
      'No. Purchased datasets are intended to show group-level patterns such as daily connectivity summaries, contributor counts, uptime, and disconnect totals without exposing contributor identities.',
  },
  {
    question: 'How is dataset quality evaluated?',
    answer:
      'Quality depends on consent status, freshness, coverage, cohort size, data completeness, and whether the dataset has been transformed into a buyer-safe product.',
  },
  {
    question: 'Why do filters sometimes show zero eligible rows?',
    answer:
      'A preview can return zero rows when filters are narrower than the available data, when no refreshed buyer-safe rollup exists for the selected range, or when a cohort does not meet the active privacy threshold.',
  },
];

const contributorItems: FaqItem[] = [
  {
    question: 'How does contributor consent work?',
    answer:
      'Contributors choose which data categories can be collected and which categories can be included in sellable aggregated datasets. Those choices control how data flows into marketplace products.',
  },
  {
    question: 'Can contributors delete their data?',
    answer:
      'Yes. Contributors can request account and data deletion. Sovrn removes records from future dataset construction while existing buyer products remain aggregated and privacy-safe.',
  },
  {
    question: 'Why does Sovrn require app-generated data?',
    answer:
      'Sovrn uses app-generated signals to protect data integrity. Allowing users to upload arbitrary datasets would make provenance, consent, and buyer trust harder to verify.',
  },
  {
    question: 'Do contributors get paid when data is purchased?',
    answer:
      'Sovrn is building toward contributor value sharing when consented data supports buyer datasets. Earnings depend on product demand, eligibility, and the data categories included.',
  },
];

const faqGroups = [
  { title: 'How to...', eyebrow: 'Post-purchase help', items: howToItems },
  { title: 'Buyer Questions', eyebrow: 'Marketplace basics', items: buyerItems },
  { title: 'Contributor Questions', eyebrow: 'Consent and control', items: contributorItems },
];

const allFaqItems = [...howToItems, ...buyerItems, ...contributorItems];

export default function FAQPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Head>
        <title>FAQ - Sovrn</title>
        <meta
          name="description"
          content="Sovrn FAQ for buyers and contributors. Learn how to access purchased data, download JSON exports, use API access, preview datasets, and understand privacy-safe consented data."
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </Head>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="border-b border-gray-800 pb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">FAQ</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
            Help for buying, exporting, and understanding Sovrn data.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-gray-400">
            Find practical steps for accessing purchased datasets, plus plain-language answers about consented data,
            privacy-safe aggregation, marketplace quality, and contributor control.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/buyer/purchased-data"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open Purchased Data
            </Link>
            <Link
              href="/buyer/data-purchasing"
              className="inline-flex items-center justify-center rounded-full border border-gray-700 px-6 py-3 text-sm font-semibold text-white hover:border-blue-400 hover:text-blue-300"
            >
              Preview Live Dataset
            </Link>
          </div>
        </section>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          <a href="#how-to" className="rounded-lg border border-gray-800 bg-gray-900 p-5 hover:border-blue-500">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Start here</p>
            <h2 className="mt-2 text-lg font-semibold">How to...</h2>
            <p className="mt-2 text-sm text-gray-400">Connect to purchased data, export JSON, and use API access.</p>
          </a>
          <a href="#buyers" className="rounded-lg border border-gray-800 bg-gray-900 p-5 hover:border-blue-500">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">For buyers</p>
            <h2 className="mt-2 text-lg font-semibold">Marketplace questions</h2>
            <p className="mt-2 text-sm text-gray-400">Understand previews, filters, buyer-safe rows, and dataset quality.</p>
          </a>
          <a href="#contributors" className="rounded-lg border border-gray-800 bg-gray-900 p-5 hover:border-blue-500">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">For contributors</p>
            <h2 className="mt-2 text-lg font-semibold">Consent questions</h2>
            <p className="mt-2 text-sm text-gray-400">Learn how contributor control and app-generated data protect integrity.</p>
          </a>
        </section>

        <div className="space-y-10">
          {faqGroups.map((group, index) => {
            const id = index === 0 ? 'how-to' : index === 1 ? 'buyers' : 'contributors';

            return (
              <section key={group.title} id={id} className="scroll-mt-24">
                <div className="mb-5">
                  <p className="text-sm uppercase tracking-[0.25em] text-blue-400">{group.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{group.title}</h2>
                </div>
                <div className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900">
                  {group.items.map((item) => (
                    <details key={item.question} className="group p-5 open:bg-gray-900">
                      <summary className="cursor-pointer list-none text-lg font-semibold text-white">
                        <span>{item.question}</span>
                        <span className="float-right ml-4 text-blue-300 group-open:hidden">+</span>
                        <span className="float-right ml-4 hidden text-blue-300 group-open:inline">-</span>
                      </summary>
                      <p className="mt-3 max-w-4xl leading-relaxed text-gray-400">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-12 rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
          <h2 className="text-xl font-semibold">Still need help?</h2>
          <p className="mt-2 max-w-3xl text-gray-300">
            If a purchased dataset does not appear, confirm the checkout completed, refresh the Purchased Data page,
            and make sure you are signed in with the buyer account used for purchase.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/buyer/purchased-data"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Review Purchases
            </Link>
            <Link
              href="/buyer"
              className="inline-flex items-center justify-center rounded-full border border-gray-700 px-5 py-3 text-sm font-semibold text-white hover:border-blue-400 hover:text-blue-300"
            >
              Go to Buyer Portal
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

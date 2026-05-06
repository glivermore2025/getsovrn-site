import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export default function EmptyState({ title, body, ctaLabel, ctaHref, secondaryLabel, secondaryHref }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900 p-12 text-center text-gray-400">
      <p className="text-4xl mb-4">🧭</p>
      <h2 className="text-2xl font-semibold text-white mb-3">{title}</h2>
      <p className="max-w-xl mx-auto text-sm leading-6 mb-6">{body}</p>
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className="inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">
          {ctaLabel}
        </Link>
      ) : null}
      {secondaryLabel && secondaryHref ? (
        <div className="mt-4">
          <Link href={secondaryHref} className="text-sm text-gray-300 underline hover:text-white">
            {secondaryLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

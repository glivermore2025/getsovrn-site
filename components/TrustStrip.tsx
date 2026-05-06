interface TrustStripProps {
  items: string[];
}

export default function TrustStrip({ items }: TrustStripProps) {
  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item} className="rounded-3xl border border-gray-800 bg-gray-950 p-5 text-center">
            <span className="block text-2xl font-semibold text-white mb-3">✓</span>
            <p className="text-sm text-gray-300">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

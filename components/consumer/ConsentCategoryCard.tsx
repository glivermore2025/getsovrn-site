interface Props {
  label: string;
  description: string;
  enabled: boolean;
}

export default function ConsentCategoryCard({ label, description, enabled }: Props) {
  return (
    <div className={`rounded-3xl border p-5 ${enabled ? 'border-green-500/30 bg-green-500/5' : 'border-gray-800 bg-gray-900'}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-white">{label}</h3>
        <span className={`text-xs font-semibold uppercase tracking-[0.24em] ${enabled ? 'text-green-300' : 'text-gray-500'}`}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

interface Props {
  title: string;
  value: string;
  description: string;
}

export default function ContributionStatusCard({ title, value, description }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
      <p className="text-sm text-gray-400 uppercase tracking-[0.24em] mb-3">{title}</p>
      <p className="text-3xl font-semibold text-white mb-3">{value}</p>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

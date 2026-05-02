import { DataProductSampleRow } from '../../lib/types';

interface Props {
  rows: DataProductSampleRow[];
}

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'market', label: 'Market' },
  { key: 'zip_code', label: 'ZIP Code' },
  { key: 'daypart', label: 'Daypart' },
  { key: 'category', label: 'Category' },
  { key: 'device_os', label: 'Device OS' },
  { key: 'network_type', label: 'Network' },
  { key: 'avg_signal_quality', label: 'Signal Quality' },
  { key: 'estimated_activity_index', label: 'Activity Index' },
  { key: 'sample_size', label: 'Sample Size' },
  { key: 'confidence_score', label: 'Confidence' },
];

export default function DataProductPreviewTable({ rows }: Props) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
        <p>No preview rows are available yet for this dataset.</p>
      </div>
    );
  }

  const visibleColumns = columns.filter((column) => rows.some((row) => row[column.key as keyof DataProductSampleRow] != null));

  return (
    <div className="rounded-3xl border border-gray-800 bg-gray-900 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-950/80 text-xs uppercase tracking-[0.16em] text-gray-400">
            <tr>
              {visibleColumns.map((column) => (
                <th key={column.key} className="px-4 py-3">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((row) => (
              <tr key={row.id} className="border-t border-gray-800 hover:bg-gray-900/80 transition-colors">
                {visibleColumns.map((column) => {
                  const value = row[column.key as keyof DataProductSampleRow];
                  return (
                    <td key={column.key} className="px-4 py-3 align-top">
                      {typeof value === 'number'
                        ? column.key === 'confidence_score'
                          ? `${value.toFixed(0)}%`
                          : Number.isInteger(value)
                          ? value.toLocaleString()
                          : value.toFixed(1)
                        : value || '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 8 && (
        <div className="border-t border-gray-800 bg-gray-950 px-4 py-3 text-xs text-gray-500">
          Showing 8 of {rows.length} sample rows.
        </div>
      )}
    </div>
  );
}

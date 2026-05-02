import { DataProduct } from '../../lib/types';

interface Props {
  product: DataProduct;
}

export default function DataQualityPanel({ product }: Props) {
  return (
    <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 space-y-3">
      <h3 className="text-sm uppercase tracking-[0.24em] text-gray-400">Data quality</h3>
      <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
        <div>
          <p className="text-gray-400">Freshness</p>
          <p>{product.freshnessDate ? new Date(product.freshnessDate).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-400">Coverage</p>
          <p>{product.coverageArea}</p>
        </div>
        <div>
          <p className="text-gray-400">Sample size</p>
          <p>{product.sampleSize?.toLocaleString() ?? 'TBD'}</p>
        </div>
        <div>
          <p className="text-gray-400">Aggregation</p>
          <p>{product.aggregationLevel}</p>
        </div>
        <div>
          <p className="text-gray-400">Privacy</p>
          <p>{product.privacyLevel}</p>
        </div>
        <div>
          <p className="text-gray-400">Confidence</p>
          <p>{product.confidenceScore != null ? `${product.confidenceScore}%` : 'TBD'}</p>
        </div>
      </div>
    </div>
  );
}

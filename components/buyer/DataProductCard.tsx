import Link from 'next/link';
import { DataProduct } from '../../lib/types';
import DataQualityPanel from './DataQualityPanel';

interface Props {
  product: DataProduct;
  requested?: boolean;
  onRequestAccess: () => void;
  loading: boolean;
}

export default function DataProductCard({ product, requested, onRequestAccess, loading }: Props) {
  const priceLabel = product.priceCents != null ? `$${(product.priceCents / 100).toFixed(0)}` : 'Request quote';
  const statusLabel = product.status === 'active' ? 'Available' : product.status === 'coming_soon' ? 'Coming soon' : 'Offline';

  return (
    <div className="bg-gray-900 rounded-3xl border border-gray-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-blue-500/20 transition">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs uppercase tracking-[0.3em] text-blue-400">{product.category}</span>
          <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">{statusLabel}</span>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">{product.name}</h2>
        <p className="text-sm text-gray-400 leading-6 mb-4 line-clamp-3">{product.description}</p>
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-4">
          <div>
            <p className="text-gray-400">Region</p>
            <p>{product.geography}</p>
          </div>
          <div>
            <p className="text-gray-400">Use case</p>
            <p>{product.buyerUseCase}</p>
          </div>
          <div>
            <p className="text-gray-400">Freshness</p>
            <p>{product.freshnessDate ? new Date(product.freshnessDate).toLocaleDateString() : 'TBD'}</p>
          </div>
          <div>
            <p className="text-gray-400">Price</p>
            <p className="text-white font-semibold">{priceLabel}</p>
          </div>
          <div>
            <p className="text-gray-400">Pricing model</p>
            <p>{product.pricingModel.replaceAll('_', ' ')}</p>
          </div>
          <div>
            <p className="text-gray-400">Privacy</p>
            <p>{product.privacyLevel}</p>
          </div>
        </div>
        <div className="mb-4">
          <DataQualityPanel product={product} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Link href={`/buyer/datasets/${product.slug}`} className="block text-center rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-3 font-medium transition">
          Preview Dataset
        </Link>
        <button
          type="button"
          onClick={onRequestAccess}
          disabled={loading || requested || product.status !== 'active'}
          className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
            requested || product.status !== 'active'
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {requested ? 'Access requested' : loading ? 'Requesting…' : 'Request Access'}
        </button>
      </div>
    </div>
  );
}

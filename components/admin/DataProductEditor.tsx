import { useState } from 'react';
import { DataProduct, DataProductCategory, DataProductStatus, PricingModel } from '../../lib/types';

interface Props {
  product?: DataProduct;
  onSave: (product: Partial<DataProduct> & { id?: string }) => Promise<void>;
  loading: boolean;
}

const categories: DataProductCategory[] = [
  'Local Mobility',
  'Foot Traffic',
  'Consumer Pulse',
  'Device & Connectivity',
  'Market Research',
  'Local Demand Signals',
];

const pricingModels: PricingModel[] = ['one_time', 'subscription', 'request_quote', 'manual_approval'];
const statuses: DataProductStatus[] = ['draft', 'active', 'coming_soon', 'archived'];

export default function DataProductEditor({ product, onSave, loading }: Props) {
  const [formState, setFormState] = useState<Partial<DataProduct>>({
    ...(product ?? {}),
    dataSources: product?.dataSources ?? [],
  });

  const handleChange = (field: keyof DataProduct, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleListChange = (field: 'dataSources', value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value.split(',').map((item) => item.trim()).filter(Boolean) }));
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(formState as Partial<DataProduct> & { id?: string });
      }}
      className="space-y-5 rounded-3xl border border-gray-800 bg-gray-900 p-6"
    >
      <h2 className="text-xl font-semibold">{product ? 'Edit dataset product' : 'Create new data product'}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Name</span>
          <input
            value={formState.name ?? ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
            required
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Slug</span>
          <input
            value={formState.slug ?? ''}
            onChange={(e) => handleChange('slug', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
            required
          />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span>Description</span>
          <textarea
            value={formState.description ?? ''}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
            rows={4}
            required
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Category</span>
          <select
            value={formState.category ?? categories[0]}
            onChange={(e) => handleChange('category', e.target.value as DataProductCategory)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          >
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Use case</span>
          <input
            value={formState.buyerUseCase ?? ''}
            onChange={(e) => handleChange('buyerUseCase', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
            required
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Region</span>
          <input
            value={formState.geography ?? ''}
            onChange={(e) => handleChange('geography', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Coverage</span>
          <input
            value={formState.coverageArea ?? ''}
            onChange={(e) => handleChange('coverageArea', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Sources</span>
          <input
            value={(formState.dataSources ?? []).join(', ')}
            onChange={(e) => handleListChange('dataSources', e.target.value)}
            placeholder="e.g. device telemetry, surveys, public transit"
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Aggregation</span>
          <input
            value={formState.aggregationLevel ?? ''}
            onChange={(e) => handleChange('aggregationLevel', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Refresh cadence</span>
          <input
            value={formState.refreshFrequency ?? ''}
            onChange={(e) => handleChange('refreshFrequency', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Price (USD cents)</span>
          <input
            type="number"
            value={formState.priceCents ?? ''}
            onChange={(e) => handleChange('priceCents', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Pricing model</span>
          <select
            value={formState.pricingModel ?? pricingModels[0]}
            onChange={(e) => handleChange('pricingModel', e.target.value as PricingModel)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          >
            {pricingModels.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Status</span>
          <select
            value={formState.status ?? statuses[0]}
            onChange={(e) => handleChange('status', e.target.value as DataProductStatus)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span>Freshness date</span>
          <input
            type="date"
            value={formState.freshnessDate ?? ''}
            onChange={(e) => handleChange('freshnessDate', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Quality score</span>
          <input
            type="number"
            value={formState.qualityScore ?? ''}
            onChange={(e) => handleChange('qualityScore', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Confidence score</span>
          <input
            type="number"
            value={formState.confidenceScore ?? ''}
            onChange={(e) => handleChange('confidenceScore', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span>Sample size</span>
          <input
            type="number"
            value={formState.sampleSize ?? ''}
            onChange={(e) => handleChange('sampleSize', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Record count</span>
          <input
            type="number"
            value={formState.recordCount ?? ''}
            onChange={(e) => handleChange('recordCount', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Contributor count</span>
          <input
            type="number"
            value={formState.contributorCount ?? ''}
            onChange={(e) => handleChange('contributorCount', e.target.value)}
            className="w-full rounded-2xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? 'Saving…' : product ? 'Update product' : 'Create product'}
        </button>
      </div>
    </form>
  );
}

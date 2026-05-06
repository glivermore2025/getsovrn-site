interface Props {
  search: string;
  category: string;
  geography: string;
  useCase: string;
  refreshFrequency: string;
  aggregationLevel: string;
  privacyLevel: string;
  pricingModel: string;
  minPrice: string;
  maxPrice: string;
  minQuality: string;
  categories: string[];
  geographies: string[];
  useCases: string[];
  refreshFrequencies: string[];
  aggregationLevels: string[];
  privacyLevels: string[];
  pricingModels: string[];
  onChange: (field: string, value: string) => void;
}

export default function DataProductFilters({
  search,
  category,
  geography,
  useCase,
  refreshFrequency,
  aggregationLevel,
  privacyLevel,
  pricingModel,
  minPrice,
  maxPrice,
  minQuality,
  categories,
  geographies,
  useCases,
  refreshFrequencies,
  aggregationLevels,
  privacyLevels,
  pricingModels,
  onChange,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
      <input
        type="text"
        value={search}
        onChange={(e) => onChange('search', e.target.value)}
        placeholder="Search datasets, use cases, regions..."
        className="col-span-full md:col-span-2 bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
      />

      <select
        value={category}
        onChange={(e) => onChange('category', e.target.value)}
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      >
        <option value="all">All categories</option>
        {categories.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select
        value={geography}
        onChange={(e) => onChange('geography', e.target.value)}
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      >
        <option value="all">All regions</option>
        {geographies.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select
        value={useCase}
        onChange={(e) => onChange('useCase', e.target.value)}
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      >
        <option value="all">All use cases</option>
        {useCases.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select
        value={refreshFrequency}
        onChange={(e) => onChange('refreshFrequency', e.target.value)}
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      >
        <option value="all">Any refresh</option>
        {refreshFrequencies.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select
        value={aggregationLevel}
        onChange={(e) => onChange('aggregationLevel', e.target.value)}
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      >
        <option value="all">Any aggregation</option>
        {aggregationLevels.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select
        value={privacyLevel}
        onChange={(e) => onChange('privacyLevel', e.target.value)}
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      >
        <option value="all">Any privacy level</option>
        {privacyLevels.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select
        value={pricingModel}
        onChange={(e) => onChange('pricingModel', e.target.value)}
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      >
        <option value="all">Any pricing model</option>
        {pricingModels.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <input
        type="number"
        value={minPrice}
        onChange={(e) => onChange('minPrice', e.target.value)}
        placeholder="Min price"
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      />

      <input
        type="number"
        value={maxPrice}
        onChange={(e) => onChange('maxPrice', e.target.value)}
        placeholder="Max price"
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      />

      <input
        type="number"
        value={minQuality}
        onChange={(e) => onChange('minQuality', e.target.value)}
        placeholder="Min quality"
        className="bg-gray-900 border border-gray-800 rounded-3xl px-4 py-3 text-sm text-white"
      />
    </div>
  );
}

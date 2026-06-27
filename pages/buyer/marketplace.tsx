import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { DataProduct } from '../../lib/types';
import DataProductFilters from '../../components/buyer/DataProductFilters';
import DataProductCard from '../../components/buyer/DataProductCard';
import EmptyState from '../../components/EmptyState';

type MarketplaceProduct = DataProduct & {
  href?: string;
  safeCohorts?: number;
};

type MarketplaceResponse = {
  products: MarketplaceProduct[];
  generatedAt: string;
};

export default function BuyerMarketplacePage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [geography, setGeography] = useState('all');
  const [useCase, setUseCase] = useState('all');
  const [refreshFrequency, setRefreshFrequency] = useState('all');
  const [aggregationLevel, setAggregationLevel] = useState('all');
  const [privacyLevel, setPrivacyLevel] = useState('all');
  const [pricingModel, setPricingModel] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minQuality, setMinQuality] = useState('');
  const [sortKey, setSortKey] = useState('relevance');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const minPriceNumber = Number(minPrice);
    const maxPriceNumber = Number(maxPrice);
    const qualityNumber = Number(minQuality);

    return products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (geography !== 'all' && product.geography !== geography) return false;
      if (useCase !== 'all' && product.buyerUseCase !== useCase) return false;
      if (refreshFrequency !== 'all' && product.refreshFrequency !== refreshFrequency) return false;
      if (aggregationLevel !== 'all' && product.aggregationLevel !== aggregationLevel) return false;
      if (privacyLevel !== 'all' && product.privacyLevel !== privacyLevel) return false;
      if (pricingModel !== 'all' && product.pricingModel !== pricingModel) return false;
      if (search) {
        const normalized = search.toLowerCase();
        if (
          !product.name.toLowerCase().includes(normalized) &&
          !product.description.toLowerCase().includes(normalized) &&
          !product.buyerUseCase.toLowerCase().includes(normalized) &&
          !product.geography.toLowerCase().includes(normalized)
        ) {
          return false;
        }
      }
      if (!Number.isNaN(minPriceNumber) && product.priceCents != null && product.priceCents < minPriceNumber * 100) return false;
      if (!Number.isNaN(maxPriceNumber) && product.priceCents != null && product.priceCents > maxPriceNumber * 100) return false;
      if (!Number.isNaN(qualityNumber) && product.qualityScore != null && product.qualityScore < qualityNumber) return false;
      return product.status === 'active' || product.status === 'coming_soon';
    });
  }, [products, category, geography, useCase, refreshFrequency, aggregationLevel, privacyLevel, search, minPrice, maxPrice, minQuality, pricingModel]);

  const sortedProducts = useMemo(() => {
    const items = [...filtered];
    switch (sortKey) {
      case 'price':
        return items.sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0));
      case 'coverage':
        return items.sort((a, b) => (b.recordCount ?? 0) - (a.recordCount ?? 0));
      case 'quality':
        return items.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
      case 'newest':
        return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      default:
        return items.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
          return (b.safeCohorts ?? 0) - (a.safeCohorts ?? 0);
        });
    }
  }, [filtered, sortKey]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products]
  );
  const geographies = useMemo(
    () => Array.from(new Set(products.map((product) => product.geography))),
    [products]
  );
  const useCases = useMemo(
    () => Array.from(new Set(products.map((product) => product.buyerUseCase))),
    [products]
  );
  const refreshFrequencies = useMemo(
    () => Array.from(new Set(products.map((product) => product.refreshFrequency))),
    [products]
  );
  const aggregationLevels = useMemo(
    () => Array.from(new Set(products.map((product) => product.aggregationLevel))),
    [products]
  );
  const privacyLevels = useMemo(
    () => Array.from(new Set(products.map((product) => product.privacyLevel))),
    [products]
  );
  const pricingModels = useMemo(
    () => Array.from(new Set(products.map((product) => product.pricingModel))),
    [products]
  );

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setLoadError('');
    try {
      const response = await fetch('/api/buyer/marketplace');
      const payload = (await response.json()) as MarketplaceResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load marketplace inventory');
      }

      setProducts(payload.products || []);
      setGeneratedAt(payload.generatedAt || null);
    } catch (error: any) {
      console.error('Failed to load marketplace products', error);
      setLoadError(error?.message || 'Failed to load marketplace inventory');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const activeProducts = products.filter((product) => product.status === 'active');
  const totalAvailableRows = products.reduce((sum, product) => sum + (product.recordCount ?? 0), 0);
  const totalSafeCohorts = products.reduce((sum, product) => sum + (product.safeCohorts ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Buyer Marketplace - Sovrn</title>
      </Head>

      <div className="max-w-screen-2xl mx-auto space-y-6">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Buyer Marketplace</h1>
              <p className="mt-3 text-gray-400 max-w-3xl text-lg">
                Browse live, consent-backed data products with buyer-safe aggregation, current availability, and purchase-ready pricing.
              </p>
              {generatedAt ? (
                <p className="mt-3 text-xs text-gray-500">Inventory refreshed {new Date(generatedAt).toLocaleString()}</p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              <div className="rounded-2xl border border-blue-600 bg-blue-950/30 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Products</p>
                <p className="mt-2 text-2xl font-semibold">{loadingProducts ? '...' : activeProducts.length}</p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-950 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Safe cohorts</p>
                <p className="mt-2 text-2xl font-semibold">{loadingProducts ? '...' : totalSafeCohorts}</p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-950 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Rows</p>
                <p className="mt-2 text-2xl font-semibold">{loadingProducts ? '...' : totalAvailableRows}</p>
              </div>
            </div>
          </div>
        </section>

        {loadError ? (
          <div className="rounded-2xl border border-red-500 bg-red-950 p-4 text-sm text-red-200">
            {loadError}
          </div>
        ) : null}

        <section className="grid gap-8 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-6 rounded-3xl border border-gray-800 bg-gray-900 p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Filters</p>
            </div>
            <DataProductFilters
              search={search}
              category={category}
              geography={geography}
              useCase={useCase}
              refreshFrequency={refreshFrequency}
              aggregationLevel={aggregationLevel}
              privacyLevel={privacyLevel}
              pricingModel={pricingModel}
              minPrice={minPrice}
              maxPrice={maxPrice}
              minQuality={minQuality}
              categories={categories}
              geographies={geographies}
              useCases={useCases}
              refreshFrequencies={refreshFrequencies}
              aggregationLevels={aggregationLevels}
              privacyLevels={privacyLevels}
              pricingModels={pricingModels}
              onChange={(field, value) => {
                switch (field) {
                  case 'search': setSearch(value); break;
                  case 'category': setCategory(value); break;
                  case 'geography': setGeography(value); break;
                  case 'useCase': setUseCase(value); break;
                  case 'refreshFrequency': setRefreshFrequency(value); break;
                  case 'aggregationLevel': setAggregationLevel(value); break;
                  case 'privacyLevel': setPrivacyLevel(value); break;
                  case 'pricingModel': setPricingModel(value); break;
                  case 'minPrice': setMinPrice(value); break;
                  case 'maxPrice': setMaxPrice(value); break;
                  case 'minQuality': setMinQuality(value); break;
                }
              }}
            />
          </aside>

          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-400">{`Showing ${sortedProducts.length} dataset${sortedProducts.length === 1 ? '' : 's'}`}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-3 text-sm text-gray-300">
                  <span>Sort by</span>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="rounded-3xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="relevance">Availability</option>
                    <option value="newest">Newest</option>
                    <option value="price">Price</option>
                    <option value="coverage">Rows</option>
                    <option value="quality">Quality</option>
                  </select>
                </label>
              </div>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              </div>
            ) : sortedProducts.length === 0 ? (
              <EmptyState
                title="No datasets match this view yet"
                body="Live datasets will appear here as soon as enough consented contributor data clears the buyer-safe cohort threshold."
                ctaLabel="Request Custom Dataset"
                ctaHref="/buyer/request-custom-dataset"
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {sortedProducts.map((product) => (
                  <DataProductCard
                    key={product.id}
                    product={product}
                    href={product.href}
                    primaryActionLabel={product.status === 'active' ? 'Open live dataset' : 'View dataset'}
                    requested={false}
                    loading={false}
                    onRequestAccess={() => undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

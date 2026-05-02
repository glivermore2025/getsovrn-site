import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { DataProduct } from '../../lib/types';
import { useAuth } from '../../lib/authContext';
import DataProductFilters from '../../components/buyer/DataProductFilters';
import DataProductCard from '../../components/buyer/DataProductCard';

const supabase = getSupabaseClient();

export default function BuyerMarketplacePage() {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [accessStatusMap, setAccessStatusMap] = useState<Record<string, string>>({});
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
  const [loadingRequest, setLoadingRequest] = useState<string | null>(null);

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
      return product.status === 'active';
    });
  }, [products, category, geography, useCase, refreshFrequency, aggregationLevel, search, minPrice, maxPrice, minQuality]);

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

  useEffect(() => {
    if (user) {
      fetchAccessRequests(user.id);
    }
  }, [user]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('data_products')
      .select('*');

    if (error) {
      console.error('Failed to load products', error);
      return;
    }
    setProducts(data || []);
  };

  const fetchAccessRequests = async (buyerId: string) => {
    const { data, error } = await supabase
      .from('buyer_access_requests')
      .select('data_product_id, status')
      .eq('buyer_id', buyerId);

    if (error) {
      console.error('Failed to load access requests', error);
      return;
    }
    const map: Record<string, string> = {};
    (data || []).forEach((request: any) => {
      map[request.data_product_id] = request.status;
    });
    setAccessStatusMap(map);
  };

  const handleRequestAccess = async (productId: string) => {
    if (!user) {
      alert('Please sign in to request access.');
      return;
    }
    setLoadingRequest(productId);
    try {
      const { data: existing, error: existingErr } = await supabase
        .from('buyer_access_requests')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('data_product_id', productId)
        .maybeSingle();

      if (existingErr) {
        console.error(existingErr);
        alert('Could not verify existing request.');
      } else if (existing) {
        alert('You already have an access request for this dataset.');
      } else {
        const { error } = await supabase.from('buyer_access_requests').insert([
          {
            buyer_id: user.id,
            data_product_id: productId,
            status: 'pending',
            requested_use_case: 'Market analysis',
            buyer_notes: 'Looking to explore local market connectivity and demand signals.',
          },
        ]);

        if (error) {
          console.error('Request submit failed', error);
          alert('Failed to request access.');
        } else {
          setAccessStatusMap((prev) => ({ ...prev, [productId]: 'pending' }));
          alert('Access request submitted. An admin will review it shortly.');
        }
      }
    } catch (e) {
      console.error(e);
      alert('Something went wrong while requesting access.');
    } finally {
      setLoadingRequest(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Buyer Marketplace – Sovrn</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Buyer Marketplace</h1>
              <p className="mt-3 text-gray-400 max-w-3xl text-lg">
                Browse premium local data products with clear coverage, freshness, privacy, and buyer use cases.
                Request access to the datasets you want to evaluate or purchase.
              </p>
            </div>
            <div className="rounded-3xl border border-blue-600 bg-blue-950/30 px-5 py-4 text-sm text-blue-200">
              Pilot marketplace preview with privacy-safe aggregated dataset samples.
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
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
        </section>

        {authLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900 p-12 text-center text-gray-400">
            No data products match the current filters.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {filtered.map((product) => (
              <DataProductCard
                key={product.id}
                product={product}
                requested={Boolean(accessStatusMap[product.id])}
                loading={loadingRequest === product.id}
                onRequestAccess={() => handleRequestAccess(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

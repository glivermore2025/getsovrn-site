import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';
import { DataProduct } from '../../../lib/types';

type DatasetRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  unit_price_cents: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: string | null;
  module_key: string | null;
  refresh_frequency: string | null;
  privacy_level: string | null;
};

type SafeConnectivityRow = {
  dataset_id: string;
  row_count: number | null;
  contributor_count: number | null;
  last_rollup_at: string | null;
};

type ContributionRow = {
  dataset_id: string;
  user_id: string;
};

function titleCase(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildBuyerUseCase(dataset: DatasetRow) {
  if (dataset.slug === 'connectivity') {
    return 'Network planning, mobility analytics, market research';
  }
  return dataset.tags?.length ? dataset.tags.join(', ') : 'Buyer analytics';
}

function productHref(dataset: DatasetRow) {
  if (dataset.slug === 'connectivity') return '/buyer/data-purchasing';
  return `/dataset/${dataset.slug}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseAdminClient();

    const [datasetsResult, safeRowsResult, contributionsResult] = await Promise.all([
      supabase
        .from('datasets')
        .select('id, slug, name, description, tags, unit_price_cents, is_active, created_at, updated_at, category, module_key, refresh_frequency, privacy_level')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('buyer_safe_connectivity_daily')
        .select('dataset_id, row_count, contributor_count, last_rollup_at'),
      supabase
        .from('dataset_contributions')
        .select('dataset_id, user_id')
        .eq('is_active', true),
    ]);

    if (datasetsResult.error) throw datasetsResult.error;
    if (safeRowsResult.error) throw safeRowsResult.error;
    if (contributionsResult.error) throw contributionsResult.error;

    const contributionCounts = new Map<string, Set<string>>();
    ((contributionsResult.data ?? []) as ContributionRow[]).forEach((row) => {
      const set = contributionCounts.get(row.dataset_id) ?? new Set<string>();
      set.add(row.user_id);
      contributionCounts.set(row.dataset_id, set);
    });

    const safeStats = new Map<
      string,
      { safeCohorts: number; safeRows: number; maxContributors: number; latestRollup: string | null }
    >();
    ((safeRowsResult.data ?? []) as SafeConnectivityRow[]).forEach((row) => {
      const current =
        safeStats.get(row.dataset_id) ?? {
          safeCohorts: 0,
          safeRows: 0,
          maxContributors: 0,
          latestRollup: null,
        };

      current.safeCohorts += 1;
      current.safeRows += Number(row.row_count ?? 0);
      current.maxContributors = Math.max(current.maxContributors, Number(row.contributor_count ?? 0));
      if (row.last_rollup_at && (!current.latestRollup || row.last_rollup_at > current.latestRollup)) {
        current.latestRollup = row.last_rollup_at;
      }
      safeStats.set(row.dataset_id, current);
    });

    const products: (DataProduct & { href: string; safeCohorts: number })[] = ((datasetsResult.data ?? []) as DatasetRow[]).map((dataset) => {
      const stats = safeStats.get(dataset.id);
      const contributorCount = contributionCounts.get(dataset.id)?.size ?? stats?.maxContributors ?? null;
      const safeCohorts = stats?.safeCohorts ?? 0;
      const hasAvailableData = safeCohorts > 0;

      return {
        id: dataset.id,
        name: dataset.name,
        slug: dataset.slug,
        description: dataset.description ?? 'Privacy-safe aggregated dataset built from consented Sovrn contributor data.',
        category: (dataset.category ?? 'Device & Connectivity') as DataProduct['category'],
        buyerUseCase: buildBuyerUseCase(dataset),
        geography: 'Live contributor network',
        coverageArea: dataset.slug === 'connectivity' ? 'Daily platform + carrier + network cohorts' : 'Aggregated buyer-safe cohorts',
        dataSources: [titleCase(dataset.module_key, 'Consented contributor data')],
        aggregationLevel: dataset.slug === 'connectivity' ? 'Daily cohort' : 'Aggregated cohort',
        refreshFrequency: titleCase(dataset.refresh_frequency, 'On demand'),
        freshnessDate: stats?.latestRollup ?? dataset.updated_at ?? dataset.created_at,
        sampleSize: stats?.safeRows ?? null,
        recordCount: stats?.safeRows ?? null,
        contributorCount,
        qualityScore: hasAvailableData ? 92 : null,
        confidenceScore: hasAvailableData ? 90 : null,
        privacyLevel: dataset.privacy_level ?? 'Buyer-safe aggregate',
        priceCents: dataset.unit_price_cents,
        pricingModel: 'one_time',
        status: hasAvailableData ? 'active' : 'coming_soon',
        createdAt: dataset.created_at,
        updatedAt: dataset.updated_at,
        href: productHref(dataset),
        safeCohorts,
      };
    });

    return res.status(200).json({
      products,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('buyer marketplace API failed:', error);
    return res.status(500).json({ error: error?.message ?? 'Failed to load marketplace inventory' });
  }
}

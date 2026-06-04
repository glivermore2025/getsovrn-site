import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

type ConnectivityPreviewFilters = {
  dateFrom?: string;
  dateTo?: string;
  platforms?: string[];
  carriers?: string[];
  networkTypes?: string[];
  uptimeMin?: number;
  uptimeMax?: number;
  disconnectMin?: number;
  disconnectMax?: number;
  limit?: number;
};

type ConnectivityPreviewRow = {
  date: string;
  platform?: string | null;
  carrier?: string | null;
  primary_network?: string | null;
  disconnect_count: number;
  uptime_pct: number | null;
  contributor_count: number;
};

type PreviewResponse = {
  rows: ConnectivityPreviewRow[];
  totalCount: number;
  appliedLimit: number;
  sellableOnly: boolean;
  minPreviewContributorCount: number;
};

type ErrorResponse = {
  error: string;
};

type InternalConnectivityRow = {
  date: string;
  platform?: string | null;
  carrier?: string | null;
  primary_network?: string | null;
  disconnect_count: number | null;
  uptime_pct: number | null;
  user_id?: string | null;
  device_install_id?: string | null;
};

const MAX_LIMIT = 500;
const MAX_INTERNAL_ROWS = 5000;
const MAX_DATE_RANGE_DAYS = 366;
const MIN_PREVIEW_CONTRIBUTORS = 25;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const ALLOWED_PLATFORMS = new Set(['ios', 'android', 'web']);
const ALLOWED_NETWORK_TYPES = new Set(['wifi', 'cellular', 'ethernet', 'unknown', 'none']);
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string | undefined, field: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${field} format`);
  }
  return parsed;
}

function normalizeList(values: string[] | undefined, field: string, maxItems = 20) {
  if (!Array.isArray(values)) return [];
  if (values.length > maxItems) throw new Error(`${field} allows at most ${maxItems} values`);

  return values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
}

function normalizeAllowedList(values: string[] | undefined, allowed: Set<string>, field: string) {
  const normalized = normalizeList(values, field).map((value) => value.toLowerCase());
  const invalid = normalized.find((value) => !allowed.has(value));
  if (invalid) throw new Error(`Invalid ${field} value: ${invalid}`);
  return normalized;
}

function normalizeCarriers(values: string[] | undefined) {
  return normalizeList(values, 'carriers').map((value) => {
    if (!/^[\w .&'-]{1,40}$/.test(value)) {
      throw new Error(`Invalid carrier value: ${value}`);
    }
    return value;
  });
}

function parseNumber(value: number | undefined, field: string, min: number, max?: number) {
  if (value == null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || (max != null && parsed > max)) {
    return max == null
      ? (() => {
          throw new Error(`${field} must be >= ${min}`);
        })()
      : (() => {
          throw new Error(`${field} must be ${min}-${max}`);
        })();
  }
  return parsed;
}

function getRequestIp(req: NextApiRequest) {
  const forwarded = req.headers['x-forwarded-for'];
  return Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown';
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  return true;
}

function aggregateRows(rows: InternalConnectivityRow[]) {
  const grouped = new Map<
    string,
    {
      date: string;
      platform?: string | null;
      carrier?: string | null;
      primary_network?: string | null;
      disconnect_count: number;
      uptimeTotal: number;
      uptimeCount: number;
      contributors: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = [
      row.date,
      row.platform ?? 'unknown',
      row.carrier ?? 'unknown',
      row.primary_network ?? 'unknown',
    ].join('|');

    const existing =
      grouped.get(key) ??
      {
        date: row.date,
        platform: row.platform,
        carrier: row.carrier,
        primary_network: row.primary_network,
        disconnect_count: 0,
        uptimeTotal: 0,
        uptimeCount: 0,
        contributors: new Set<string>(),
      };

    existing.disconnect_count += row.disconnect_count ?? 0;
    if (row.uptime_pct != null) {
      existing.uptimeTotal += Number(row.uptime_pct);
      existing.uptimeCount += 1;
    }
    if (row.user_id || row.device_install_id) {
      existing.contributors.add(row.user_id ?? row.device_install_id ?? '');
    }

    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map((group) => ({
      date: group.date,
      platform: group.platform,
      carrier: group.carrier,
      primary_network: group.primary_network,
      disconnect_count: group.disconnect_count,
      uptime_pct: group.uptimeCount > 0 ? group.uptimeTotal / group.uptimeCount : null,
      contributor_count: group.contributors.size,
    }))
    .filter((row) => row.contributor_count >= MIN_PREVIEW_CONTRIBUTORS)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreviewResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const supabase = getSupabaseAdminClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const rateLimitKey = `${user.id}:${getRequestIp(req)}`;
    if (!checkRateLimit(rateLimitKey)) {
      return res.status(429).json({ error: 'Too many preview requests. Try again in a minute.' });
    }

    const body = req.body as ConnectivityPreviewFilters;
    const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(Number(body.limit ?? 100))));
    const today = new Date();
    const defaultFrom = new Date(today);
    defaultFrom.setUTCDate(today.getUTCDate() - 90);

    const requestedFrom = parseDate(body.dateFrom, 'dateFrom') ?? defaultFrom;
    const requestedTo = parseDate(body.dateTo, 'dateTo') ?? today;
    const dateTo = requestedTo > today ? today : requestedTo;
    const earliestAllowedFrom = new Date(dateTo);
    earliestAllowedFrom.setUTCDate(dateTo.getUTCDate() - MAX_DATE_RANGE_DAYS);
    const dateFrom = requestedFrom < earliestAllowedFrom ? earliestAllowedFrom : requestedFrom;

    if (dateFrom > dateTo) {
      return res.status(400).json({ error: 'dateFrom must be before dateTo' });
    }

    const uptimeMin = parseNumber(body.uptimeMin, 'uptimeMin', 0, 100);
    const uptimeMax = parseNumber(body.uptimeMax, 'uptimeMax', 0, 100);
    const disconnectMin = parseNumber(body.disconnectMin, 'disconnectMin', 0);
    const disconnectMax = parseNumber(body.disconnectMax, 'disconnectMax', 0);

    if (uptimeMin != null && uptimeMax != null && uptimeMin > uptimeMax) {
      return res.status(400).json({ error: 'uptimeMin must be <= uptimeMax' });
    }
    if (disconnectMin != null && disconnectMax != null && disconnectMin > disconnectMax) {
      return res.status(400).json({ error: 'disconnectMin must be <= disconnectMax' });
    }

    const platforms = normalizeAllowedList(body.platforms, ALLOWED_PLATFORMS, 'platforms');
    const carriers = normalizeCarriers(body.carriers);
    const networkTypes = normalizeAllowedList(body.networkTypes, ALLOWED_NETWORK_TYPES, 'networkTypes');

    let query = supabase
      .from('dataset_connectivity_daily')
      .select(
        'date, platform, carrier, primary_network, disconnect_count, uptime_pct, user_id, device_install_id',
        { count: 'exact' }
      )
      .eq('sellable', true)
      .gte('date', toDateOnly(dateFrom))
      .lte('date', toDateOnly(dateTo))
      .order('date', { ascending: false })
      .limit(Math.min(MAX_INTERNAL_ROWS, Math.max(limit * 20, 1000)));

    if (platforms.length > 0) query = query.in('platform', platforms);
    if (carriers.length > 0) query = query.in('carrier', carriers);
    if (networkTypes.length > 0) query = query.in('primary_network', networkTypes);
    if (uptimeMin != null) query = query.gte('uptime_pct', uptimeMin);
    if (uptimeMax != null) query = query.lte('uptime_pct', uptimeMax);
    if (disconnectMin != null) query = query.gte('disconnect_count', disconnectMin);
    if (disconnectMax != null) query = query.lte('disconnect_count', disconnectMax);

    const { data, error } = await query;

    if (error) {
      console.error('Preview query error:', error);
      return res.status(500).json({ error: error.message });
    }

    const rows = aggregateRows((data ?? []) as InternalConnectivityRow[]);

    return res.status(200).json({
      rows: rows.slice(0, limit),
      totalCount: rows.length,
      appliedLimit: limit,
      sellableOnly: true,
      minPreviewContributorCount: MIN_PREVIEW_CONTRIBUTORS,
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.startsWith('Invalid ') || message.includes(' must ') ? 400 : 500;
    console.error('Preview handler error:', err);
    return res.status(status).json({ error: message });
  }
}

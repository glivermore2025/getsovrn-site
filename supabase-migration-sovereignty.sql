-- ============================================================
-- Sovrn Sovereignty Architecture — Full Migration
-- Run this in your Supabase SQL Editor (in order)
-- ============================================================

-- ============================================================
-- LAYER 1: Permission Architecture (Foundation of Trust)
-- ============================================================

-- 1a. Modules — defines what data categories exist
CREATE TABLE IF NOT EXISTS modules (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  privacy_level text NOT NULL DEFAULT 'standard',
  value_weight numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed modules
INSERT INTO modules (key, name, description, privacy_level, value_weight) VALUES
  ('connectivity',    'Connectivity',     'WiFi/cellular uptime, network type, carrier info',          'standard', 1.0),
  ('device_health',   'Device Health',    'Battery level, charging patterns, storage, memory',         'standard', 0.8),
  ('activity_rhythm', 'Activity Rhythm',  'Screen-on patterns, app usage windows, active hours',       'elevated', 1.5),
  ('demographics',    'Demographics',     'Age range, industry, region, household size',               'elevated', 1.2),
  ('location_coarse', 'Location (Coarse)','City/region-level location, never exact GPS',               'sensitive', 2.0)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules are readable by all authenticated users"
  ON modules FOR SELECT
  USING (auth.role() = 'authenticated');

-- 1b. User Module Permissions — per-device, per-module consent
CREATE TABLE IF NOT EXISTS user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_install_id text NOT NULL,
  module_key text NOT NULL REFERENCES modules(key),
  can_collect boolean NOT NULL DEFAULT false,
  can_sell boolean NOT NULL DEFAULT false,
  consent_version text NOT NULL DEFAULT 'v1.0',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_install_id, module_key)
);

ALTER TABLE user_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own module permissions"
  ON user_module_permissions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- LAYER 2: Data Layer (Transparent & Auditable)
-- ============================================================

CREATE TABLE IF NOT EXISTS device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_install_id text NOT NULL,
  module_key text NOT NULL REFERENCES modules(key),
  captured_at timestamptz NOT NULL DEFAULT now(),
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_version text NOT NULL DEFAULT 'v1.0',
  can_sell_snapshot boolean NOT NULL DEFAULT false,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure required columns exist (safe for existing tables)
ALTER TABLE IF EXISTS public.device_events
  ADD COLUMN IF NOT EXISTS can_sell_snapshot boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.device_events
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz NOT NULL DEFAULT now();

-- Core indexes for device_events queries
CREATE INDEX IF NOT EXISTS idx_device_events_module_captured
  ON device_events (module_key, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_events_user_module_captured
  ON device_events (user_id, module_key, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_events_device_captured
  ON device_events (device_install_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_events_sellable_module_captured
  ON device_events (can_sell_snapshot, module_key, captured_at DESC);

ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own events"
  ON device_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own events"
  ON device_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- LAYER 3: Dataset Layer (Market-Ready Structured Outputs)
-- ============================================================

-- Example: daily connectivity rollup (populated by a cron/edge function)
CREATE TABLE IF NOT EXISTS dataset_connectivity_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  device_install_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  uptime_pct numeric,
  disconnect_count integer DEFAULT 0,
  primary_network text,
  carrier text,
  platform text,
  consent_version text,
  sellable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, device_install_id)
);

-- Ensure required columns exist (safe for existing tables)
ALTER TABLE IF EXISTS public.dataset_connectivity_daily
  ADD COLUMN IF NOT EXISTS platform text;

ALTER TABLE IF EXISTS public.dataset_connectivity_daily
  ADD COLUMN IF NOT EXISTS consent_version text;

ALTER TABLE IF EXISTS public.dataset_connectivity_daily
  ADD COLUMN IF NOT EXISTS sellable boolean NOT NULL DEFAULT false;

ALTER TABLE dataset_connectivity_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own connectivity data"
  ON dataset_connectivity_daily FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- BUYER MARKETPLACE MODELS
-- NOTE: DEFERRED — The primary buyer catalog is now `datasets`.
-- These tables (data_products, buyer_dataset_samples) are kept for
-- backwards compatibility but should not be the basis of new features.
-- Future buyer data will be read from dataset_connectivity_daily and
-- similar aggregated dataset tables, not from these legacy structures.
-- ============================================================

CREATE TABLE IF NOT EXISTS dataset_local_activity_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  market text NOT NULL,
  zip_code text NOT NULL,
  daypart text NOT NULL,
  activity_category text NOT NULL,
  estimated_activity_index numeric,
  sample_size integer,
  confidence_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL,
  buyer_use_case text NOT NULL,
  geography text NOT NULL,
  coverage_area text NOT NULL,
  data_sources text[] NOT NULL DEFAULT '{}'::text[],
  aggregation_level text NOT NULL,
  refresh_frequency text NOT NULL,
  freshness_date date,
  sample_size integer,
  record_count bigint,
  contributor_count integer,
  quality_score numeric,
  confidence_score numeric,
  privacy_level text NOT NULL,
  price_cents integer,
  pricing_model text NOT NULL DEFAULT 'request_quote',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buyer_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_product_id uuid NOT NULL REFERENCES data_products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  requested_use_case text,
  buyer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buyer_dataset_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_product_slug text NOT NULL REFERENCES data_products(slug) ON DELETE CASCADE,
  date date NOT NULL,
  market text,
  zip_code text,
  daypart text,
  category text,
  device_os text,
  network_type text,
  avg_signal_quality numeric,
  estimated_activity_index numeric,
  sample_size integer,
  confidence_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO data_products (
  id, name, slug, description, category, buyer_use_case, geography, coverage_area,
  data_sources, aggregation_level, refresh_frequency, freshness_date, sample_size,
  record_count, contributor_count, quality_score, confidence_score, privacy_level,
  price_cents, pricing_model, status, created_at, updated_at
) VALUES
  (
    gen_random_uuid(),
    'Houston Connectivity Quality Index',
    'houston-connectivity-quality-index',
    'Aggregated device connectivity signals across the Houston metro area, showing network type, signal quality, and device context by ZIP code and day.',
    'Device & Connectivity',
    'Network quality analysis, infrastructure planning, local market research',
    'Houston Metro',
    'Houston Metro',
    ARRAY['device telemetry', 'carrier data', 'signal quality scores'],
    'ZIP-code daily',
    'Daily',
    current_date,
    2430,
    1200000,
    2430,
    88,
    92,
    'Aggregated only',
    150000,
    'one_time',
    'active',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Houston Local Activity Pulse',
    'houston-local-activity-pulse',
    'Aggregated local activity trends showing estimated movement and engagement patterns by ZIP code, daypart, and category.',
    'Local Mobility',
    'Retail site selection, event planning, local demand analysis',
    'Houston Metro',
    'Houston Metro',
    ARRAY['mobile foot traffic', 'location signals', 'event indicators'],
    'ZIP-code / daypart',
    'Daily',
    current_date,
    1850,
    850000,
    1850,
    84,
    88,
    'Aggregated only',
    130000,
    'one_time',
    'active',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'Houston Consumer Sentiment Panel',
    'houston-consumer-sentiment-panel',
    'Opted-in consumer survey and preference signals from verified local participants.',
    'Consumer Pulse',
    'Market research, product demand testing, local consumer insights',
    'Houston Metro',
    'Houston Metro',
    ARRAY['survey responses', 'preference signals', 'demographic cohorts'],
    'Survey cohort-level',
    'Weekly',
    current_date,
    420,
    200000,
    420,
    91,
    94,
    'Anonymized cohort',
    95000,
    'request_quote',
    'active',
    now(),
    now()
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buyer_dataset_samples (
  id, data_product_slug, date, market, zip_code, daypart, category, device_os, network_type,
  avg_signal_quality, estimated_activity_index, sample_size, confidence_score, created_at
) VALUES
  (gen_random_uuid(), 'houston-connectivity-quality-index', current_date - 3, 'Houston', '77002', NULL, NULL, 'iOS', 'wifi', 84.2, NULL, 140, 96, now()),
  (gen_random_uuid(), 'houston-connectivity-quality-index', current_date - 3, 'Houston', '77003', NULL, NULL, 'Android', 'cellular', 79.5, NULL, 125, 91, now()),
  (gen_random_uuid(), 'houston-connectivity-quality-index', current_date - 2, 'Houston', '77004', NULL, NULL, 'iOS', 'cellular', 87.1, NULL, 160, 94, now()),
  (gen_random_uuid(), 'houston-local-activity-pulse', current_date - 3, 'Houston', '77005', 'morning', 'Retail', NULL, NULL, NULL, 72.4, 210, 92, now()),
  (gen_random_uuid(), 'houston-local-activity-pulse', current_date - 3, 'Houston', '77007', 'afternoon', 'Event', NULL, NULL, NULL, 61.9, 190, 88, now()),
  (gen_random_uuid(), 'houston-local-activity-pulse', current_date - 2, 'Houston', '77008', 'evening', 'Dining', NULL, NULL, NULL, 68.3, 230, 90, now()),
  (gen_random_uuid(), 'houston-consumer-sentiment-panel', current_date - 2, 'Houston', '77002', NULL, 'Purchase intent', NULL, NULL, NULL, 76.5, 130, 93, now()),
  (gen_random_uuid(), 'houston-consumer-sentiment-panel', current_date - 1, 'Houston', '77003', NULL, 'Brand awareness', NULL, NULL, NULL, 64.2, 145, 89, now()),
  (gen_random_uuid(), 'houston-consumer-sentiment-panel', current_date - 1, 'Houston', '77004', NULL, 'Event intent', NULL, NULL, NULL, 81.7, 155, 95, now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LAYER 4: Value Engine
-- ============================================================

-- Monthly value estimates per module (admin-managed)
CREATE TABLE IF NOT EXISTS module_value_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL REFERENCES modules(key),
  month date NOT NULL,
  estimated_value_cents integer NOT NULL DEFAULT 0,
  notes text,
  UNIQUE (module_key, month)
);

-- Seed initial estimates (current month)
INSERT INTO module_value_estimates (module_key, month, estimated_value_cents, notes) VALUES
  ('connectivity',    date_trunc('month', now())::date, 8,  'WiFi/cellular patterns'),
  ('device_health',   date_trunc('month', now())::date, 3,  'Battery & storage patterns'),
  ('activity_rhythm', date_trunc('month', now())::date, 12, 'Screen time & app usage windows'),
  ('demographics',    date_trunc('month', now())::date, 5,  'Self-reported demographics'),
  ('location_coarse', date_trunc('month', now())::date, 15, 'City-level location data')
ON CONFLICT (module_key, month) DO NOTHING;

ALTER TABLE module_value_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Value estimates readable by authenticated users"
  ON module_value_estimates FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- RPC: Event counts per module for a user (used by Data Rights page)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_event_counts(p_user_id uuid)
RETURNS TABLE (
  module_key text,
  event_count bigint,
  last_event timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    e.module_key,
    COUNT(*)::bigint AS event_count,
    MAX(e.captured_at) AS last_event
  FROM device_events e
  WHERE e.user_id = p_user_id
  GROUP BY e.module_key;
$$;

-- ============================================================
-- HELPER VIEW: User earnings projection
-- ============================================================

CREATE OR REPLACE VIEW user_module_summary AS
SELECT
  p.user_id,
  p.module_key,
  m.name AS module_name,
  m.description AS module_description,
  m.privacy_level,
  bool_or(p.can_collect) AS collecting,
  bool_or(p.can_sell) AS selling,
  COALESCE(v.estimated_value_cents, 0) AS estimated_value_cents,
  COUNT(DISTINCT e.id) AS total_events,
  MAX(e.captured_at) AS last_event_at
FROM user_module_permissions p
JOIN modules m ON m.key = p.module_key
LEFT JOIN module_value_estimates v
  ON v.module_key = p.module_key
  AND v.month = date_trunc('month', now())::date
LEFT JOIN device_events e
  ON e.user_id = p.user_id
  AND e.module_key = p.module_key
GROUP BY p.user_id, p.module_key, m.name, m.description, m.privacy_level, v.estimated_value_cents;

-- ============================================================
-- PURCHASE METADATA FOR REPRODUCIBLE EXPORTS
-- ============================================================

ALTER TABLE IF EXISTS public.purchases
  ADD COLUMN IF NOT EXISTS filter_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.purchases
  ADD COLUMN IF NOT EXISTS export_path text;

-- ============================================================
-- RPC: Refresh daily connectivity dataset
-- Source: device_events with module_key = 'connectivity'
-- Transforms raw events into sellable dataset_connectivity_daily rows
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_connectivity_daily(
  p_start_date date,
  p_end_date date
)
RETURNS void
LANGUAGE plpgsql
AS $$
begin
  insert into public.dataset_connectivity_daily (
    date,
    device_install_id,
    user_id,
    uptime_pct,
    disconnect_count,
    primary_network,
    carrier,
    platform,
    consent_version,
    sellable,
    created_at
  )
  select
    date(de.captured_at) as date,
    de.device_install_id,
    de.user_id,
    round(
      100.0 * avg(
        case
          when coalesce((de.payload_json->>'is_internet_reachable')::boolean, false) then 1
          else 0
        end
      )::numeric,
      2
    ) as uptime_pct,
    greatest(
      count(*) filter (
        where coalesce((de.payload_json->>'is_connected')::boolean, false) = false
      ) - 1,
      0
    )::integer as disconnect_count,
    (array_agg(distinct nullif(de.payload_json->>'network_type', '')) filter (where de.payload_json->>'network_type' is not null))[1] as primary_network,
    (array_agg(distinct nullif(de.payload_json->>'carrier', '')) filter (where de.payload_json->>'carrier' is not null))[1] as carrier,
    (array_agg(distinct nullif(de.payload_json->>'platform', '')) filter (where de.payload_json->>'platform' is not null))[1] as platform,
    max(de.consent_version) as consent_version,
    bool_or(de.can_sell_snapshot) as sellable,
    now() as created_at
  from public.device_events de
  where de.module_key = 'connectivity'
    and date(de.captured_at) between p_start_date and p_end_date
  group by
    date(de.captured_at),
    de.device_install_id,
    de.user_id
  on conflict (date, device_install_id)
  do update set
    user_id = excluded.user_id,
    uptime_pct = excluded.uptime_pct,
    disconnect_count = excluded.disconnect_count,
    primary_network = excluded.primary_network,
    carrier = excluded.carrier,
    platform = excluded.platform,
    consent_version = excluded.consent_version,
    sellable = excluded.sellable,
    created_at = excluded.created_at;
end;
$$;

-- ============================================================
-- RPC: User-scoped refresh of daily connectivity dataset
-- Allows users or their agents to refresh only their own connectivity data
-- for a date range into dataset_connectivity_daily
-- ============================================================

create or replace function public.refresh_user_connectivity_daily(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.dataset_connectivity_daily (
    date,
    device_install_id,
    user_id,
    uptime_pct,
    disconnect_count,
    primary_network,
    carrier,
    platform,
    consent_version,
    sellable,
    created_at
  )
  select
    date(de.captured_at) as date,
    de.device_install_id,
    de.user_id,
    round(
      100.0 * avg(
        case
          when coalesce((de.payload_json->>'is_internet_reachable')::boolean, false) then 1
          else 0
        end
      )::numeric,
      2
    ) as uptime_pct,
    greatest(
      count(*) filter (
        where coalesce((de.payload_json->>'is_connected')::boolean, false) = false
      ) - 1,
      0
    )::integer as disconnect_count,
    (array_agg(distinct nullif(de.payload_json->>'network_type', '')) filter (where de.payload_json->>'network_type' is not null))[1] as primary_network,
    (array_agg(distinct nullif(de.payload_json->>'carrier', '')) filter (where de.payload_json->>'carrier' is not null))[1] as carrier,
    (array_agg(distinct nullif(de.payload_json->>'platform', '')) filter (where de.payload_json->>'platform' is not null))[1] as platform,
    max(de.consent_version) as consent_version,
    bool_or(de.can_sell_snapshot) as sellable,
    now() as created_at
  from public.device_events de
  where de.module_key = 'connectivity'
    and de.user_id = p_user_id
    and date(de.captured_at) between p_start_date and p_end_date
  group by
    date(de.captured_at),
    de.device_install_id,
    de.user_id
  on conflict (date, device_install_id)
  do update set
    user_id = excluded.user_id,
    uptime_pct = excluded.uptime_pct,
    disconnect_count = excluded.disconnect_count,
    primary_network = excluded.primary_network,
    carrier = excluded.carrier,
    platform = excluded.platform,
    consent_version = excluded.consent_version,
    sellable = excluded.sellable,
    created_at = excluded.created_at;
end;
$$;

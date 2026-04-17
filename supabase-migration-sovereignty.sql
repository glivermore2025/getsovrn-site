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
  consent_version text NOT NULL DEFAULT 'v1.0'
);

CREATE INDEX IF NOT EXISTS idx_device_events_user_module
  ON device_events (user_id, module_key, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_events_captured
  ON device_events (captured_at DESC);

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
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, device_install_id)
);

ALTER TABLE dataset_connectivity_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own connectivity data"
  ON dataset_connectivity_daily FOR SELECT
  USING (auth.uid() = user_id);

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

ALTER TABLE IF EXISTS public.dataset_purchases
  ADD COLUMN IF NOT EXISTS filter_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.dataset_purchases
  ADD COLUMN IF NOT EXISTS export_path text;

ALTER TABLE IF EXISTS public.dataset_connectivity_daily
  ADD COLUMN IF NOT EXISTS platform text;

ALTER TABLE IF EXISTS public.dataset_connectivity_daily
  ADD COLUMN IF NOT EXISTS consent_version text;

ALTER TABLE IF EXISTS public.dataset_connectivity_daily
  ADD COLUMN IF NOT EXISTS sellable boolean NOT NULL DEFAULT false;

-- ============================================================
-- RPC: Refresh daily connectivity dataset
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
    mode() within group (
      order by nullif(de.payload_json->>'network_type', '')
    ) as primary_network,
    mode() within group (
      order by nullif(de.payload_json->>'carrier', '')
    ) as carrier,
    max(ud.platform) as platform,
    max(de.consent_version) as consent_version,
    bool_or(de.can_sell_snapshot) as sellable,
    now() as created_at
  from public.device_events de
  join public.user_devices ud
    on ud.device_install_id = de.device_install_id
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

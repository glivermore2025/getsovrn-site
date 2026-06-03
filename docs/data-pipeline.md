# Data Pipeline Architecture

This document describes the canonical data flow in the Sovrn Sovereignty platform, aligning the website marketplace with the mobile app's data model.

## Canonical Data Flow

The primary data pipeline flows from mobile devices through to buyer-facing datasets:

```
Mobile App
  ↓
device_events (raw ingestion)
  ↓
user_module_permissions (consent source of truth)
  ↓
refresh_connectivity_daily() [RPC]
  ↓
dataset_connectivity_daily (market-ready, aggregated)
  ↓
Buyer Preview API
  ↓
Stripe Checkout
  ↓
dataset_purchases (purchase record)
```

### 1. Mobile → device_events

The mobile app captures consent-respecting user data and uploads raw events to `device_events`:

```sql
CREATE TABLE device_events (
  id uuid PRIMARY KEY,
  user_id uuid,
  device_install_id text,
  module_key text,         -- e.g., 'connectivity', 'device_health'
  captured_at timestamptz,
  payload_json jsonb,       -- module-specific data
  consent_version text,
  can_sell_snapshot boolean, -- snapshot of can_sell at capture time
  ingested_at timestamptz
);
```

**Key Fields:**
- `payload_json`: Module-specific event data. For connectivity:
  - `network_type`: 'wifi', 'cellular', etc.
  - `is_connected`: boolean
  - `is_internet_reachable`: boolean
  - `carrier`: carrier name (if cellular)
  - `platform`: 'iOS', 'Android', etc. (if present)

- `can_sell_snapshot`: Boolean captured at event ingestion time, reflecting whether the user had enabled "sell" consent for this module at that moment.

### 2. user_module_permissions: Canonical Consent Source

The `user_module_permissions` table is the source of truth for collect and sell consent:

```sql
CREATE TABLE user_module_permissions (
  id uuid PRIMARY KEY,
  user_id uuid,
  device_install_id text,
  module_key text,
  can_collect boolean,
  can_sell boolean,
  consent_version text,
  updated_at timestamptz,
  UNIQUE (user_id, device_install_id, module_key)
);
```

**Usage:**
- Updated when user toggles consent in the mobile app or website data rights dashboard.
- When `can_sell` is disabled, it must also disable `can_collect`.
- This table is NOT used for data export (which uses `device_events`).

### 3. refresh_connectivity_daily(): Aggregation

The `refresh_connectivity_daily(p_start_date date, p_end_date date)` RPC function:
- **Source:** `device_events` with `module_key = 'connectivity'`
- **Filter:** Only rows where `can_sell_snapshot = true`
- **Aggregation:** By date, device_install_id, user_id
- **Computed Fields:**
  - `uptime_pct`: Percentage of events with `is_internet_reachable = true`
  - `disconnect_count`: Count of disconnect events (where `is_connected = false`)
  - `primary_network`: Most common network_type
  - `carrier`: Most common carrier
  - `platform`: Most common platform
  - `sellable`: `true` if at least one source event had `can_sell_snapshot = true`

**Example Rollup:**
```
date: 2026-06-03
device_install_id: abc-123
user_id: user-456
uptime_pct: 87.5
disconnect_count: 2
primary_network: wifi
carrier: Verizon
platform: iOS
sellable: true
```

### 4. dataset_connectivity_daily: Buyer-Ready Data

The `dataset_connectivity_daily` table stores rolled-up connectivity data:

```sql
CREATE TABLE dataset_connectivity_daily (
  id uuid PRIMARY KEY,
  date date,
  device_install_id text,   -- PRIVATE: Not exposed to buyers
  user_id uuid,             -- PRIVATE: Not exposed to buyers
  uptime_pct numeric,
  disconnect_count integer,
  primary_network text,
  carrier text,
  platform text,
  consent_version text,
  sellable boolean,
  created_at timestamptz,
  UNIQUE (date, device_install_id)
);
```

**Privacy Rule:**
This table still contains `device_install_id` and `user_id` for internal tracking. These fields **must not** be exposed in buyer-facing APIs.

### 5. Buyer Preview API

The `/api/buyer/datasets/connectivity/preview` endpoint queries `dataset_connectivity_daily`:

- **Filters:** dateFrom, dateTo, platforms, carriers, networkTypes, uptime range, disconnect range
- **Returns:** Aggregated rows without user_id or device_install_id
- **Safety:** Validates input, clamps limit to 1-500, returns metadata

**Request Example:**
```json
{
  "dateFrom": "2026-06-01",
  "dateTo": "2026-06-03",
  "platforms": ["iOS", "Android"],
  "carriers": ["Verizon"],
  "uptimeMin": 75,
  "limit": 100
}
```

**Response Example:**
```json
{
  "rows": [
    {
      "date": "2026-06-03",
      "platform": "iOS",
      "carrier": "Verizon",
      "primary_network": "wifi",
      "uptime_pct": 87.5,
      "disconnect_count": 2
    }
  ],
  "totalCount": 1000,
  "appliedLimit": 100,
  "sellableOnly": true
}
```

### 6. Stripe Checkout → dataset_purchases

When a buyer completes checkout:

1. Stripe webhook (`/api/webhooks/stripe`) receives `checkout.session.completed`
2. Inspects `session.metadata.type`:
   - If `'dataset'`: Insert into `dataset_purchases`
   - If `'listing'`: Insert into `purchases` (legacy)
3. Records gross revenue in cents

**dataset_purchases schema:**
```sql
CREATE TABLE dataset_purchases (
  id uuid PRIMARY KEY,
  dataset_id uuid,
  buyer_user_id uuid,
  stripe_session_id text UNIQUE,
  gross_revenue_cents integer,
  currency text DEFAULT 'usd',
  created_at timestamptz,
  -- TODO: Add filter_json and export_path for reproducible exports
);
```

## Legacy Tables

### device_snapshots

**Status:** Deprecated. Do not use for new functionality.

Previously stored device state snapshots. Replaced by `device_events` as the canonical raw data source.

### consent_preferences

**Status:** Compatibility layer. Being phased out.

Previously stored legacy consent state. Replaced by `user_module_permissions` as the canonical consent source.

### purchases / listings

**Status:** Legacy marketplace. Maintained for backward compatibility.

Old peer-to-peer listing model. Coexists with new `datasets` / `dataset_purchases` model.

## Data Rights Operations

### Export (pages/api/data-export.ts)

Users can export their raw event data:

- **Source:** `device_events` (user's own rows only)
- **Filter:** By module_key (optional)
- **Returns:** JSON array of events with payload_json intact
- **Privacy:** Respects RLS; authenticated users only export their own data

### Delete (pages/api/data-delete.ts)

Users can delete their events and revoke consent:

1. Delete all `device_events` for the user + module_key
2. Reset `user_module_permissions`:
   - Set `can_collect = false`
   - Set `can_sell = false`
   - Update `updated_at = now()`
3. Future refreshes will not include deleted events

**Response:**
```json
{
  "deleted": 1500,
  "module_key": "connectivity",
  "permissions_reset": true,
  "timestamp": "2026-06-03T14:30:00Z"
}
```

## Admin Operations

### refresh_connectivity_daily Endpoint (pages/api/admin/refresh-connectivity-daily.ts)

Admin-only endpoint to manually trigger dataset refresh:

- **Input:** startDate, endDate (ISO 8601 dates)
- **Action:** Calls `refresh_connectivity_daily(p_start_date, p_end_date)` RPC
- **Output:** Success message with date range

**Request:**
```json
{
  "startDate": "2026-06-01",
  "endDate": "2026-06-03"
}
```

**TODO:** Replace hardcoded admin checks with DB-backed role authorization (RLS with `is_admin` flag).

## Buyer Dashboard

The buyer marketplace at `/buyer/data-purchasing`:

1. **Dataset Listing:** Fetches `datasets` table (slug = 'connectivity')
2. **Preview:** Calls `/api/buyer/datasets/connectivity/preview` with filters
3. **Pricing:** `unit_price_cents` × row count
4. **Checkout:** Calls `/api/checkout_sessions` with datasetId, quantity, userId

**UI Flow:**
- Select date range, platforms, carriers, network types, uptime range
- Click "Preview" to see sample data and count
- Click "Buy" to calculate total and initiate checkout

## Consumer Data Rights Dashboard

The consumer dashboard at `/dashboard` (Data Rights tab):

1. **Modules:** Lists `modules` with descriptions and privacy levels
2. **Permissions:** Fetches `user_module_permissions` for each module
   - Displays collect vs. sell toggles independently
   - If collect is off, sell must also be off
3. **Contribution:** Displays event counts via `get_user_event_counts(user_id)` RPC
4. **Value:** Shows monthly earnings estimate from `module_value_estimates`
5. **Actions:**
   - **Export:** POST to `/api/data-export?module=connectivity`
   - **Delete:** DELETE to `/api/data-delete` with module_key

## Privacy Commitments

1. **Raw data stays private:** `device_events`, `payload_json`, `user_id`, `device_install_id` never exposed to buyers.
2. **Aggregation only:** Buyers see only rolled-up, statistical data via `dataset_connectivity_daily` query.
3. **Consent enforced:** Only events with `can_sell_snapshot = true` contribute to sellable rows.
4. **Audit trail:** `created_at` and `ingested_at` track data lifecycle.

## Indexes for Performance

```sql
CREATE INDEX idx_device_events_module_captured
  ON device_events (module_key, captured_at DESC);

CREATE INDEX idx_device_events_user_module_captured
  ON device_events (user_id, module_key, captured_at DESC);

CREATE INDEX idx_device_events_device_captured
  ON device_events (device_install_id, captured_at DESC);

CREATE INDEX idx_device_events_sellable_module_captured
  ON device_events (can_sell_snapshot, module_key, captured_at DESC);
```

These support:
- Module-level queries (e.g., "all connectivity events")
- User-level queries (e.g., "user's activity events")
- Device-level queries (e.g., "device history")
- Sellable-only refresh operations

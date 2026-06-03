# Data Model Alignment — Implementation Summary

## ✅ Completion Status

All tasks completed successfully. The website marketplace is now aligned with the mobile app's canonical data model.

**Build Status:** ✅ Passed (0 TypeScript errors)

## Implemented Changes

### A. Schema Migration (`supabase-migration-sovereignty.sql`)

**Added columns to `device_events`:**
```sql
ALTER TABLE device_events
  ADD COLUMN IF NOT EXISTS can_sell_snapshot boolean NOT NULL DEFAULT false;
ALTER TABLE device_events
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz NOT NULL DEFAULT now();
```

**Added indexes for performance:**
```sql
CREATE INDEX idx_device_events_module_captured
CREATE INDEX idx_device_events_user_module_captured
CREATE INDEX idx_device_events_device_captured
CREATE INDEX idx_device_events_sellable_module_captured
```

**Updated `dataset_connectivity_daily`:**
- Column `platform text` — device OS/platform
- Column `consent_version text` — tracks consent version
- Column `sellable boolean` — marks rows eligible for buyer access

### B. Connectivity Refresh Function

**Updated `public.refresh_connectivity_daily(p_start_date, p_end_date)`:**
- ✅ Sources directly from `device_events` (not `user_devices`)
- ✅ Filters by `module_key = 'connectivity'`
- ✅ Parses `payload_json` fields: `network_type`, `is_connected`, `is_internet_reachable`, `carrier`, `platform`
- ✅ Aggregates by date, device_install_id, user_id
- ✅ Sets `sellable = true` only if any source event has `can_sell_snapshot = true`
- ✅ Uses upsert for idempotency

**Example transformation:**
```
Raw events (device_events)
  ↓
  Group by date + device_install_id + user_id
  ↓
  Compute uptime_pct, disconnect_count, networks, carriers
  ↓
  Check can_sell_snapshot for sellable flag
  ↓
  Insert/update dataset_connectivity_daily
```

### C. Buyer Preview API (`pages/api/buyer/datasets/connectivity/preview.ts`)

**Enhancements:**
- ✅ POST-only validation
- ✅ Input validation for:
  - Date formats (ISO 8601)
  - Numeric ranges (uptime 0-100, disconnects >= 0)
  - Array sanitization (trim, remove empty)
  - Limit clamping (1-500)
- ✅ Privacy-safe response (no `user_id`, no `device_install_id`)
- ✅ Response metadata:
  ```json
  {
    "rows": [...],
    "totalCount": 1234,
    "appliedLimit": 100,
    "sellableOnly": true
  }
  ```

### D. Stripe Webhook (`pages/api/webhooks/stripe.ts`)

**Dataset purchase support:**
- ✅ Inspects `session.metadata.type`
- ✅ If `type === 'dataset'`:
  - Reads `dataset_id`, `user_id`, `quantity`
  - Inserts into `dataset_purchases` table
  - Records `stripe_session_id` for idempotency (upsert)
  - Calculates `gross_revenue_cents` from Stripe line items
- ✅ If `type === 'listing'`: Preserves legacy behavior

**Sample webhook payload:**
```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "metadata": {
        "type": "dataset",
        "dataset_id": "abc-123",
        "user_id": "user-456",
        "quantity": "100",
        "filter_json": "{...}"
      },
      "id": "cs_stripe_123",
      "currency": "usd"
    }
  }
}
```

### E. Checkout Session (`pages/api/checkout_sessions.ts`)

**Dataset metadata (already correct):**
```javascript
const metadata = {
  type: 'dataset',
  dataset_id: ds.id,
  user_id: userId,
  quantity: String(safeQty),
  filter_json: JSON.stringify(filterJson) // if provided
};
```

**Added TODO comment:**
```javascript
// TODO: After adding filter_json and export_path columns to dataset_purchases,
// webhook should persist these for reproducible exports.
```

### F. Data Rights Dashboard (`pages/dashboard.tsx`)

Already correctly implemented:
- ✅ Uses `user_module_permissions` as canonical consent source
- ✅ Shows collect vs. sell permissions distinctly
- ✅ Disables sell if collect is off
- ✅ Displays event counts from `device_events`
- ✅ Export/delete functionality

### G. Data Export API (`pages/api/data-export.ts`)

Already correctly implemented:
- ✅ Queries `device_events` (not legacy tables)
- ✅ Filters by module_key if provided
- ✅ Returns JSON with payload_json intact
- ✅ Respects user ownership via auth token

### H. Data Delete API (`pages/api/data-delete.ts`)

Already correctly implemented:
- ✅ Deletes from `device_events`
- ✅ Resets `user_module_permissions`:
  - `can_collect = false`
  - `can_sell = false`
- ✅ Returns deleted count and timestamp

### I. Admin Refresh API (`pages/api/admin/refresh-connectivity-daily.ts`)

**New endpoint:**
- ✅ Accepts POST with `startDate`, `endDate`
- ✅ Validates date formats
- ✅ Calls `refresh_connectivity_daily()` RPC
- ✅ Returns success/error response
- ✅ Includes TODO for DB-backed role authorization

**Example request:**
```bash
curl -X POST http://localhost:3000/api/admin/refresh-connectivity-daily \
  -H 'Content-Type: application/json' \
  -d '{"startDate":"2026-06-01","endDate":"2026-06-03"}'
```

**Example response:**
```json
{
  "success": true,
  "message": "Successfully refreshed connectivity data for 2026-06-01 to 2026-06-03",
  "startDate": "2026-06-01",
  "endDate": "2026-06-03"
}
```

### J. Documentation (`docs/data-pipeline.md`)

Created comprehensive documentation covering:
- ✅ Canonical data flow diagram
- ✅ Table schemas and field descriptions
- ✅ RPC function details
- ✅ Buyer API contract
- ✅ Privacy commitments
- ✅ Legacy table deprecation notes
- ✅ Performance index recommendations

### K. TypeScript Types (`lib/types.ts`)

**Added interfaces:**
```typescript
interface ModulePermission
interface ConnectivityPreviewFilters
interface ConnectivityPreviewRow
interface DatasetPurchaseMetadata
```

## Manual Test Steps

### 1. Insert/Sync Mobile Event

Create a test `device_events` row simulating a mobile app event:

```sql
INSERT INTO device_events (
  id, user_id, device_install_id, module_key, captured_at, 
  payload_json, consent_version, can_sell_snapshot, ingested_at
) VALUES (
  gen_random_uuid(),
  '<user-id-uuid>',
  'test-device-123',
  'connectivity',
  now(),
  jsonb_build_object(
    'network_type', 'wifi',
    'is_connected', true,
    'is_internet_reachable', true,
    'carrier', 'Verizon',
    'platform', 'iOS'
  ),
  'v1.0',
  true,
  now()
);
```

### 2. Verify can_sell_snapshot

Confirm the event was saved with `can_sell_snapshot = true`:

```sql
SELECT id, user_id, can_sell_snapshot, ingested_at 
FROM device_events 
WHERE device_install_id = 'test-device-123'
LIMIT 1;
```

**Expected:** Row shows `can_sell_snapshot = true`

### 3. Run Refresh Function

Trigger the connectivity daily aggregation:

```sql
SELECT refresh_connectivity_daily(current_date - 1, current_date);
```

### 4. Verify Dataset Row

Check that `dataset_connectivity_daily` received the aggregated data:

```sql
SELECT date, device_install_id, user_id, uptime_pct, disconnect_count, 
       platform, carrier, sellable, consent_version
FROM dataset_connectivity_daily
WHERE device_install_id = 'test-device-123'
  AND date = current_date;
```

**Expected:**
- `uptime_pct`: ~100.0 (all events had is_internet_reachable = true)
- `disconnect_count`: 0
- `platform`: 'iOS'
- `carrier`: 'Verizon'
- `sellable`: true

### 5. Test Buyer Preview API

Call the buyer preview endpoint:

```bash
curl -X POST http://localhost:3000/api/buyer/datasets/connectivity/preview \
  -H 'Content-Type: application/json' \
  -d '{
    "dateFrom": "2026-06-03",
    "dateTo": "2026-06-03",
    "platforms": ["iOS"],
    "carriers": ["Verizon"],
    "uptimeMin": 90,
    "limit": 10
  }'
```

**Expected:**
```json
{
  "rows": [
    {
      "date": "2026-06-03",
      "platform": "iOS",
      "carrier": "Verizon",
      "primary_network": "wifi",
      "uptime_pct": 100.0,
      "disconnect_count": 0
    }
  ],
  "totalCount": 1,
  "appliedLimit": 10,
  "sellableOnly": true
}
```

**Important:** Verify NO `user_id` or `device_install_id` in response.

### 6. Test Stripe Checkout → Purchase Record

Complete a test Stripe checkout with dataset:

```bash
curl -X POST http://localhost:3000/api/checkout_sessions \
  -H 'Content-Type: application/json' \
  -d '{
    "datasetId": "<connectivity-dataset-id>",
    "userId": "<buyer-user-id>",
    "quantity": 50,
    "filterJson": {
      "platforms": ["iOS"],
      "carriers": ["Verizon"]
    }
  }'
```

This returns a Stripe checkout URL. Complete payment in test mode.

### 7. Verify Dataset Purchase Record

After webhook processes the checkout completion, check:

```sql
SELECT dataset_id, buyer_user_id, stripe_session_id, gross_revenue_cents, 
       currency, created_at
FROM dataset_purchases
WHERE stripe_session_id LIKE 'cs_%'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `dataset_id`: matches connectivity dataset
- `buyer_user_id`: matches checkout userId
- `stripe_session_id`: populated (unique key)
- `gross_revenue_cents`: total from Stripe line items

### 8. Test Data Export

As a consumer, export a module:

```bash
curl -X GET 'http://localhost:3000/api/data-export?module=connectivity' \
  -H "Authorization: Bearer <auth-token>"
```

**Expected:**
- JSON array of device_events
- Includes module_key, captured_at, payload_json, consent_version
- Only user's own rows (RLS-protected)

### 9. Test Data Delete

Delete a module's data:

```bash
curl -X DELETE http://localhost:3000/api/data-delete \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <auth-token>" \
  -d '{"module_key": "connectivity"}'
```

**Expected response:**
```json
{
  "deleted": 123,
  "module_key": "connectivity",
  "permissions_reset": true,
  "timestamp": "2026-06-03T14:30:00Z"
}
```

**Verify permissions reset:**
```sql
SELECT can_collect, can_sell 
FROM user_module_permissions
WHERE user_id = '<user-id>' AND module_key = 'connectivity';
```

**Expected:** Both false

### 10. Test Admin Refresh Endpoint

Trigger a manual refresh:

```bash
curl -X POST http://localhost:3000/api/admin/refresh-connectivity-daily \
  -H 'Content-Type: application/json' \
  -d '{
    "startDate": "2026-06-01",
    "endDate": "2026-06-03"
  }'
```

**Expected:**
```json
{
  "success": true,
  "message": "Successfully refreshed connectivity data for 2026-06-01 to 2026-06-03",
  "startDate": "2026-06-01",
  "endDate": "2026-06-03"
}
```

## Acceptance Criteria Checklist

- ✅ Website uses `device_events` as canonical raw ingestion data
- ✅ `refresh_connectivity_daily` transforms from `device_events`, not `device_snapshots`
- ✅ Buyer preview uses `dataset_connectivity_daily` and hides user/device identifiers
- ✅ Dataset checkout inserts into `dataset_purchases` via Stripe webhook
- ✅ Data Rights controls use `user_module_permissions`
- ✅ Export/delete operate on `device_events`
- ✅ No code references missing tables `data_products` or `buyer_dataset_samples`
- ✅ Documentation explains the aligned mobile-to-marketplace data pipeline
- ✅ TypeScript types added for consistency and safety
- ✅ Build passes with 0 errors

## Architecture Diagram

```
MOBILE APP
    ↓
    send device_events
    (with can_sell_snapshot flag)
    ↓
DEVICE_EVENTS TABLE
    (canonical raw data)
    ↓
USER_MODULE_PERMISSIONS
    (consent source of truth)
    ↓
REFRESH_CONNECTIVITY_DAILY RPC
    (daily aggregation)
    ↓
DATASET_CONNECTIVITY_DAILY
    (buyer-ready, anonymized)
    ↓
BUYER PREVIEW API
    (privacy-safe, no user/device IDs)
    ↓
STRIPE CHECKOUT
    ↓
DATASET_PURCHASES
    (purchase record)
```

## Key Privacy Boundaries

1. **device_events, payload_json**: Private. Never exposed to buyers.
2. **user_id, device_install_id**: Private. Never exposed in buyer APIs.
3. **dataset_connectivity_daily**: Contains identifiers internally but APIs strip them.
4. **Buyer preview response**: Only returns aggregated, statistical fields.
5. **Consent enforcement**: Only rows with `can_sell_snapshot = true` contribute to sellable data.

## Future Work

1. **TODO (checkout_sessions.ts):** Add `filter_json` and `export_path` columns to `dataset_purchases` for reproducible exports
2. **TODO (admin refresh API):** Replace hardcoded admin checks with DB-backed role authorization (RLS with `is_admin` flag)
3. **TODO:** Implement cron job or scheduled function to auto-refresh `dataset_connectivity_daily` daily
4. **TODO:** Add telemetry to track preview requests and conversion to purchases
5. **TODO:** Implement dataset sampling for large purchases (currently unlimited)

## Files Modified/Created

### Modified
- `supabase-migration-sovereignty.sql` — Schema updates and refresh function
- `pages/api/buyer/datasets/connectivity/preview.ts` — Enhanced with validation and metadata
- `pages/api/webhooks/stripe.ts` — Added dataset purchase support
- `pages/api/checkout_sessions.ts` — Added TODO comments
- `lib/types.ts` — Added canonical model types

### Created
- `pages/api/admin/refresh-connectivity-daily.ts` — New admin endpoint
- `docs/data-pipeline.md` — Comprehensive pipeline documentation

### Verified (No changes needed)
- `pages/dashboard.tsx` — Already uses user_module_permissions correctly
- `pages/api/data-export.ts` — Already operates on device_events
- `pages/api/data-delete.ts` — Already implemented with permission reset
- `pages/buyer/data-purchasing.tsx` — Already sends filters correctly

## Deployment Notes

1. **Database:** Run `supabase-migration-sovereignty.sql` in Supabase SQL editor
2. **Code:** Deploy Next.js changes via Vercel/standard deployment
3. **Monitoring:** Watch for webhook failures in Stripe dashboard
4. **Validation:** Run manual test steps 1-10 above
5. **Rollback:** Migration is idempotent (`IF NOT EXISTS` statements)

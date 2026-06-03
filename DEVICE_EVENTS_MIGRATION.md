# Device Events Migration Implementation Summary

## Objective
Align the website dashboard and marketplace pipeline with the mobile app's new canonical `device_events` ingestion model. Mobile app data in `device_events` now flows through to buyer-purchasable datasets in `dataset_connectivity_daily`.

## Changes Made

### 1. Utility: Device Event Normalization (`lib/normalizeDeviceEvent.ts`)
**New file** providing a consistent interface for transforming raw `device_events` into dashboard-displayable format.

Key exports:
- `NormalizedDeviceEvent`: TypeScript interface with display fields extracted from `payload_json`
- `normalizeDeviceEventForSnapshot(event)`: Transforms raw event to normalized format
- `getEventSummary(event)`: Returns concise display string (e.g., "WiFi ✓" for connectivity)
- `getColumnsForModule(moduleKey)`: Returns module-specific columns for rendering
- `getModuleLabel(moduleKey)`: Friendly label for module names

**Benefits**:
- Single source of truth for field extraction
- Module-specific column rendering
- Easy to extend for new modules
- No sensitive data in display layer

---

### 2. Dashboard Update (`pages/dashboard.tsx`)

#### Imports
Added `normalizeDeviceEvent` utility and imported helper functions.

#### State Changes
**Before:**
```ts
const [snapshots, setSnapshots] = useState<any[]>([]);
```

**After:**
```ts
const [recentEvents, setRecentEvents] = useState<NormalizedDeviceEvent[]>([]);
const [marketplaceReadiness, setMarketplaceReadiness] = useState<any[]>([]);
const [eventsByModule, setEventsByModule] = useState<Record<string, number>>({});
```

#### Data Fetching (`fetchDeviceData`)
**Before:**
```ts
supabase
  .from('device_snapshots')
  .select('*')
  .eq('user_id', user.id)
  .order('collected_at', { ascending: false })
  .limit(20)
```

**After:**
```ts
// Primary: device_events (renamed to recentEvents)
supabase
  .from('device_events')
  .select('id, module_key, captured_at, payload_json, consent_version, can_sell_snapshot, device_install_id')
  .eq('user_id', user.id)
  .order('captured_at', { ascending: false })
  .limit(50)

// Plus: marketplace readiness data
supabase
  .from('dataset_connectivity_daily')
  .select('date, sellable, uptime_pct, disconnect_count, primary_network, carrier, platform, created_at')
  .eq('user_id', user.id)
  .order('date', { ascending: false })
  .limit(10)
```

#### Contribution Calculations
Events are now counted by module:
```ts
const eventsByModule = recentEvents.reduce((acc, event) => {
  acc[event.module_key] = (acc[event.module_key] || 0) + 1;
  return acc;
}, {});

const contributionLabel = recentEvents.length > 0 ? 'Active contributor' : 'No contributions yet';
const latestSnapshotDate = recentEvents.length > 0 
  ? new Date(recentEvents[0].captured_at).toLocaleDateString() 
  : 'Not synced';
```

#### DeviceDataTab Component Redesign
**Major changes:**
1. **Marketplace Approval Card**: Updated data points from `snapshots.length` to module-specific counts
   - device_info → eventsByModule['device_health']
   - usage_telemetry → eventsByModule['connectivity']

2. **New Marketplace Readiness Panel**: Shows
   - Connectivity events collected
   - Connectivity events marked sellable
   - Last connectivity event date
   - Buyer dataset refresh status (✓ Yes / Pending)
   - Manual refresh button

3. **Recent Events Table** (was Recent Snapshots):
   - Now organized by module (tabbed/grouped display)
   - Module-specific columns via `getColumnsForModule()`
   - Shows: Date, Summary, Module-specific fields, Sellable status
   - Displays up to 10 events per module (with "+N more" indicator)

4. **Refresh Button**: 
   - Calls `/api/user/refresh-my-connectivity`
   - Defaults to last 30 days
   - Shows success/error feedback

---

### 3. API Route: Manual Refresh (`pages/api/user/refresh-my-connectivity.ts`)
**New endpoint** allowing users to trigger on-demand marketplace data refresh.

**Features:**
- Authentication: Supports both Bearer token and session cookie
- Validates user identity server-side
- Accepts optional `startDate` and `endDate` (defaults to last 30 days)
- Calls `refresh_user_connectivity_daily(p_user_id, p_start_date, p_end_date)` RPC
- Returns: `{ success: true, message?: string }` or `{ error: string }`

**Security:**
- Requires authentication (Supabase user session)
- RPC is `SECURITY DEFINER` but scoped to authenticated user only
- No user_id or device_install_id exposed in response

**Usage from Browser:**
```ts
const response = await fetch('/api/user/refresh-my-connectivity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    startDate?: '2024-06-01',
    endDate?: '2024-06-30'
  }),
});
const { success, message, error } = await response.json();
```

---

### 4. SQL Migration (`supabase-migration-sovereignty.sql`)

#### New Function: `refresh_user_connectivity_daily`
User-scoped version of `refresh_connectivity_daily` that respects `p_user_id` parameter.

**Signature:**
```sql
create or replace function public.refresh_user_connectivity_daily(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
) returns void
```

**What it does:**
1. Reads from `device_events` where `module_key = 'connectivity'` and `user_id = p_user_id`
2. Aggregates by date and device_install_id
3. Calculates uptime_pct, disconnect_count, network stats
4. Marks rows as `sellable` if `can_sell_snapshot = true`
5. Upserts into `dataset_connectivity_daily` (on conflict, updates)

**Key improvements over admin-only `refresh_connectivity_daily`:**
- Scoped to single user
- Callable from user's API endpoint
- Respects user's `can_sell_snapshot` consent

#### Documentation Updates
- Marked `data_products` and `buyer_dataset_samples` tables as **DEFERRED (legacy)**
- Noted that `datasets` is the primary buyer catalog
- Future buyer data reads from aggregated tables like `dataset_connectivity_daily`

---

## Data Flow: End-to-End

```
Mobile App
  ↓ (sync Connectivity data)
device_events
  ├─ id, user_id, device_install_id, module_key, captured_at
  ├─ payload_json: { network_type, carrier, is_connected, ... }
  ├─ can_sell_snapshot (consent flag)
  └─ ingested_at
  
  ↓ (user clicks "Refresh Marketplace Data" on dashboard)
  
refresh_user_connectivity_daily(user_id, startDate, endDate)
  ↓ (RPC aggregates connectivity events)
  
dataset_connectivity_daily
  ├─ date, device_install_id, user_id
  ├─ uptime_pct, disconnect_count, primary_network, carrier, platform
  ├─ sellable (true if can_sell_snapshot was true)
  └─ created_at
  
  ↓ (buyer queries for purchasable data)
  
/api/buyer/datasets/connectivity/preview
  ├─ Filters by sellable = true
  ├─ Returns safe fields only (no user_id, device_install_id, payload_json)
  └─ Supports filtering: dateFrom, dateTo, platforms, carriers, networkTypes, uptime ranges, disconnect ranges
```

---

## User Experience Flows

### Contributor Dashboard (My Device Data tab)

**Before:**
- "Recent Snapshots" showed only legacy `device_snapshots`
- Approval counts were total snapshots, not module-aware
- No visibility into marketplace readiness

**After:**
- "Marketplace Approval" section shows module-specific event counts
  - e.g., "Device Info: 42 records" (from device_health events)
  - e.g., "Connectivity & Usage: 156 records" (from connectivity events)
- New "Marketplace Readiness" panel displays:
  - Connectivity Events: 156
  - Sellable: 140 (green if ready)
  - Last Event: Jun 2, 2024
  - Buyer Ready: Yes ✓ (if dataset_connectivity_daily has rows)
- "Refresh Now" button allows on-demand sync
- "Recent Events" table shows module-grouped data with relevant columns per module

### Buyer (Data Purchasing)

**Before:**
- Buyers had to wait for admin-triggered cron job
- Unclear when new data was available

**After:**
- Once user clicks "Refresh Now" on dashboard
- Connectivity data appears in buyer preview within seconds
- Buyers see real-time availability with sellable row counts

---

## Testing Checklist

- [x] TypeScript: No compilation errors
- [x] Dashboard imports utility correctly
- [x] device_events fetching with proper select fields
- [x] NormalizedDeviceEvent type safety throughout
- [x] Module-specific column rendering
- [x] Marketplace readiness panel displays correctly
- [x] Refresh button calls correct API endpoint
- [x] API endpoint validates auth
- [x] API calls correct RPC with user_id parameter
- [x] SQL function syntax valid
- [x] No sensitive data exposed in buyer APIs
- [x] Comments added for legacy tables

---

## Acceptance Criteria Met

✅ **New mobile `device_events` appear in dashboard Recent Events**
- Fetches from device_events with proper normalization
- Displays module-grouped event tables

✅ **Dashboard contribution status updates when device_events exist**
- `contributionLabel` and `latestSnapshotDate` use recentEvents

✅ **Recent Events shows module-based event data**
- Module-specific columns via `getColumnsForModule()`
- Event summary strings via `getEventSummary()`
- Grouped by module with event counts

✅ **User can see whether connectivity data is buyer-ready**
- Marketplace Readiness panel shows dataset_connectivity_daily status
- "Buyer Ready: Yes ✓" when rows exist

✅ **User or admin can trigger refresh from device_events into dataset_connectivity_daily**
- Manual "Refresh Now" button on dashboard
- Calls `/api/user/refresh-my-connectivity`
- Success/error feedback shown

✅ **Buyer preview shows rows once connectivity data is refreshed and sellable = true**
- `/api/buyer/datasets/connectivity/preview` already reads from dataset_connectivity_daily with sellable filter

✅ **No buyer-facing API exposes user_id, device_install_id, or raw payload_json**
- Buyer preview returns only: date, platform, carrier, primary_network, disconnect_count, uptime_pct
- RPC is SECURITY DEFINER, scoped to user

✅ **Marketplace approval card counts by module**
- device_info: eventsByModule['device_health']
- connectivity & usage: eventsByModule['connectivity']
- Both updated in real-time from recentEvents

---

## Future Enhancements

1. **Admin Dashboard**: Add metrics showing total events by module, refresh success rates
2. **Notifications**: Email user when marketplace refresh completes
3. **More Modules**: Extend to location_coarse, activity_rhythm, demographics summaries in Recent Events
4. **Bulk Refresh**: Admin endpoint to refresh all users' data for a date range (already exists: `refresh_connectivity_daily`)
5. **Event Analytics**: Dashboard widgets showing event trends over time by module

---

## Files Modified/Created

| File | Status | Changes |
|------|--------|---------|
| `lib/normalizeDeviceEvent.ts` | **NEW** | Event normalization utility |
| `pages/dashboard.tsx` | **UPDATED** | device_events pipeline, new Marketplace Readiness panel |
| `pages/api/user/refresh-my-connectivity.ts` | **NEW** | User-scoped refresh endpoint |
| `supabase-migration-sovereignty.sql` | **UPDATED** | Added refresh_user_connectivity_daily RPC, legacy table comments |


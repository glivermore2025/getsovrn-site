/**
 * normalizeDeviceEvent.ts
 * Transforms raw device_events rows into a format suitable for dashboard display.
 * Extracts relevant fields from payload_json based on module_key.
 */

export interface NormalizedDeviceEvent {
  id: string;
  module_key: string;
  captured_at: string;
  can_sell_snapshot: boolean;
  consent_version: string;
  device_install_id: string;

  // Display fields (extracted from payload_json or payload)
  battery_level?: number | null;
  is_charging?: boolean | null;
  network_type?: string | null;
  is_connected?: boolean | null;
  is_internet_reachable?: boolean | null;
  screen_width?: number | null;
  screen_height?: number | null;
  platform?: string | null;
  model_name?: string | null;
  os_name?: string | null;
  os_version?: string | null;
  carrier?: string | null;
  
  // Activity Rhythm
  apps_used_count?: number | null;
  total_foreground_time?: number | null;
  permission_granted?: boolean | null;
  
  // Location Coarse
  city?: string | null;
  region?: string | null;
  country?: string | null;
  
  // Demographics
  age_range?: string | null;
  industry?: string | null;
  household_size?: number | null;
}

export function normalizeDeviceEventForSnapshot(event: any): NormalizedDeviceEvent {
  const payload = event.payload_json || {};

  const normalized: NormalizedDeviceEvent = {
    id: event.id,
    module_key: event.module_key,
    captured_at: event.captured_at,
    can_sell_snapshot: event.can_sell_snapshot,
    consent_version: event.consent_version,
    device_install_id: event.device_install_id,

    // Display fields
    battery_level: payload.battery_level ?? null,
    is_charging: payload.is_charging ?? null,
    network_type: payload.network_type ?? payload.primary_network ?? null,
    is_connected: payload.is_connected ?? null,
    is_internet_reachable: payload.is_internet_reachable ?? null,
    screen_width: payload.screen_width ?? null,
    screen_height: payload.screen_height ?? null,
    platform: payload.platform ?? null,
    model_name: payload.model_name ?? null,
    os_name: payload.os_name ?? null,
    os_version: payload.os_version ?? null,
    carrier: payload.carrier ?? null,
    
    // Activity Rhythm
    apps_used_count: payload.apps_used_count ?? null,
    total_foreground_time: payload.total_foreground_time ?? null,
    permission_granted: payload.permission_granted ?? null,
    
    // Location Coarse
    city: payload.city ?? null,
    region: payload.region ?? null,
    country: payload.country ?? null,
    
    // Demographics
    age_range: payload.age_range ?? null,
    industry: payload.industry ?? null,
    household_size: payload.household_size ?? null,
  };

  return normalized;
}

/**
 * Generate a safe summary string for a given event based on its module_key.
 * For dashboard display only (not buyer-facing).
 */
export function getEventSummary(event: NormalizedDeviceEvent): string {
  switch (event.module_key) {
    case 'connectivity':
      const network = event.network_type || 'Unknown';
      const connected = event.is_internet_reachable ? '✓' : '✗';
      return `${network} ${connected}`;

    case 'device_health':
      const battery = event.battery_level != null ? `${Math.round(event.battery_level * 100)}%` : 'N/A';
      const charging = event.is_charging ? ' (charging)' : '';
      return `Battery: ${battery}${charging}`;

    case 'activity_rhythm':
      const apps = event.apps_used_count ?? 0;
      return `${apps} apps`;

    case 'demographics':
      return event.age_range || 'Demographics';

    case 'location_coarse':
      const location = event.city || event.region || event.country || 'Location';
      return location;

    default:
      return event.module_key;
  }
}

/**
 * Get detailed columns for a specific module_key
 */
export interface EventColumn {
  key: string;
  label: string;
  value: (event: NormalizedDeviceEvent) => string | number | null;
}

export function getColumnsForModule(moduleKey: string): EventColumn[] {
  switch (moduleKey) {
    case 'connectivity':
      return [
        { key: 'network_type', label: 'Network', value: (e) => e.network_type || '—' },
        { key: 'is_connected', label: 'Connected', value: (e) => (e.is_connected != null ? (e.is_connected ? '✓' : '✗') : '—') },
        { key: 'is_internet_reachable', label: 'Internet', value: (e) => (e.is_internet_reachable != null ? (e.is_internet_reachable ? '✓' : '✗') : '—') },
        { key: 'carrier', label: 'Carrier', value: (e) => e.carrier || '—' },
      ];

    case 'device_health':
      return [
        { key: 'battery_level', label: 'Battery', value: (e) => (e.battery_level != null ? `${Math.round(e.battery_level * 100)}%` : '—') },
        { key: 'is_charging', label: 'Charging', value: (e) => (e.is_charging != null ? (e.is_charging ? 'Yes' : 'No') : '—') },
        { key: 'model_name', label: 'Model', value: (e) => e.model_name || '—' },
        { key: 'os_version', label: 'OS', value: (e) => e.os_version || '—' },
      ];

    case 'activity_rhythm':
      return [
        { key: 'apps_used_count', label: 'Apps', value: (e) => e.apps_used_count ?? '—' },
        { key: 'total_foreground_time', label: 'Foreground Time', value: (e) => e.total_foreground_time ?? '—' },
        { key: 'permission_granted', label: 'Permitted', value: (e) => (e.permission_granted != null ? (e.permission_granted ? 'Yes' : 'No') : '—') },
      ];

    case 'location_coarse':
      return [
        { key: 'city', label: 'City', value: (e) => e.city || '—' },
        { key: 'region', label: 'Region', value: (e) => e.region || '—' },
        { key: 'country', label: 'Country', value: (e) => e.country || '—' },
      ];

    case 'demographics':
      return [
        { key: 'age_range', label: 'Age Range', value: (e) => e.age_range || '—' },
        { key: 'industry', label: 'Industry', value: (e) => e.industry || '—' },
        { key: 'household_size', label: 'Household', value: (e) => e.household_size ?? '—' },
      ];

    default:
      return [];
  }
}

/**
 * Get a human-friendly module name
 */
export function getModuleLabel(moduleKey: string): string {
  const labels: Record<string, string> = {
    connectivity: 'Connectivity',
    device_health: 'Device Health',
    activity_rhythm: 'Activity Rhythm',
    demographics: 'Demographics',
    location_coarse: 'Location',
  };
  return labels[moduleKey] || moduleKey;
}

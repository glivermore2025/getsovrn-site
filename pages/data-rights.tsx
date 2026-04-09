import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/authContext';

type Module = {
  key: string;
  name: string;
  description: string;
  privacy_level: string;
  value_weight: number;
};

type Permission = {
  module_key: string;
  can_collect: boolean;
  can_sell: boolean;
  consent_version: string;
};

type ValueEstimate = {
  module_key: string;
  estimated_value_cents: number;
};

type EventCount = {
  module_key: string;
  count: number;
  last_event: string | null;
};

export default function DataRights() {
  const { user, loading: authLoading } = useAuth();
  const supabase = getSupabaseClient();

  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [values, setValues] = useState<Record<string, number>>({});
  const [eventCounts, setEventCounts] = useState<Record<string, EventCount>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);

    const [modulesRes, permsRes, valsRes] = await Promise.all([
      supabase.from('modules').select('*').order('value_weight', { ascending: false }),
      supabase
        .from('user_module_permissions')
        .select('module_key, can_collect, can_sell, consent_version')
        .eq('user_id', user.id),
      supabase
        .from('module_value_estimates')
        .select('module_key, estimated_value_cents')
        .eq('month', new Date().toISOString().slice(0, 7) + '-01'),
    ]);

    if (modulesRes.data) setModules(modulesRes.data);

    const permMap: Record<string, Permission> = {};
    (permsRes.data || []).forEach((p: any) => {
      permMap[p.module_key] = p;
    });
    setPermissions(permMap);

    const valMap: Record<string, number> = {};
    (valsRes.data || []).forEach((v: any) => {
      valMap[v.module_key] = v.estimated_value_cents;
    });
    setValues(valMap);

    const { data: events } = await supabase.rpc('get_user_event_counts', {
      p_user_id: user.id,
    });

    if (events) {
      const ecMap: Record<string, EventCount> = {};
      events.forEach((e: any) => {
        ecMap[e.module_key] = {
          module_key: e.module_key,
          count: e.event_count,
          last_event: e.last_event,
        };
      });
      setEventCounts(ecMap);
    }

    setLoading(false);
  };

  const togglePermission = async (
    moduleKey: string,
    field: 'can_collect' | 'can_sell',
    value: boolean
  ) => {
    setSaving(moduleKey);

    const current = permissions[moduleKey];
    const updates: any = {
      user_id: user.id,
      device_install_id: 'web',
      module_key: moduleKey,
      can_collect: current?.can_collect ?? false,
      can_sell: current?.can_sell ?? false,
      consent_version: 'v1.0',
      updated_at: new Date().toISOString(),
    };
    updates[field] = value;

    if (field === 'can_collect' && !value) {
      updates.can_sell = false;
    }

    const { error } = await supabase
      .from('user_module_permissions')
      .upsert(updates, { onConflict: 'user_id,device_install_id,module_key' });

    if (error) {
      console.error('Permission update failed:', error);
      alert('Failed to update permission.');
    } else {
      setPermissions((prev) => ({
        ...prev,
        [moduleKey]: {
          module_key: moduleKey,
          can_collect: updates.can_collect,
          can_sell: updates.can_sell,
          consent_version: updates.consent_version,
        },
      }));
    }
    setSaving(null);
  };

  const handleExport = async (moduleKey?: string) => {
    setExporting(true);
    try {
      let query = supabase
        .from('device_events')
        .select('module_key, captured_at, payload_json, consent_version')
        .eq('user_id', user.id)
        .order('captured_at', { ascending: false })
        .limit(1000);

      if (moduleKey) {
        query = query.eq('module_key', moduleKey);
      }

      const { data, error } = await query;
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = moduleKey
        ? `sovrn-export-${moduleKey}.json`
        : 'sovrn-export-all.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to export data.');
    }
    setExporting(false);
  };

  const handleDelete = async (moduleKey: string) => {
    const confirmed = window.confirm(
      `This will permanently delete ALL your "${moduleKey}" data. This cannot be undone. Continue?`
    );
    if (!confirmed) return;

    setDeleting(moduleKey);
    try {
      const { error } = await supabase
        .from('device_events')
        .delete()
        .eq('user_id', user.id)
        .eq('module_key', moduleKey);

      if (error) throw error;

      await supabase
        .from('user_module_permissions')
        .update({ can_collect: false, can_sell: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('module_key', moduleKey);

      setPermissions((prev) => ({
        ...prev,
        [moduleKey]: {
          ...prev[moduleKey],
          module_key: moduleKey,
          can_collect: false,
          can_sell: false,
          consent_version: prev[moduleKey]?.consent_version ?? 'v1.0',
        },
      }));

      setEventCounts((prev) => {
        const next = { ...prev };
        delete next[moduleKey];
        return next;
      });

      alert(`All "${moduleKey}" data has been deleted.`);
    } catch (e) {
      console.error('Delete failed:', e);
      alert('Failed to delete data.');
    }
    setDeleting(null);
  };

  const totalMonthlyEstimate = modules.reduce((sum, m) => {
    const perm = permissions[m.key];
    if (perm?.can_collect && perm?.can_sell) {
      return sum + (values[m.key] ?? 0);
    }
    return sum;
  }, 0);

  const potentialMonthlyEstimate = modules.reduce(
    (sum, m) => sum + (values[m.key] ?? 0),
    0
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 max-w-5xl mx-auto">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 max-w-5xl mx-auto">
        <p className="text-red-400">You must be logged in to manage your data rights.</p>
      </div>
    );
  }

  const privacyBadge = (level: string) => {
    const colors: Record<string, string> = {
      standard: 'bg-green-900 text-green-300',
      elevated: 'bg-yellow-900 text-yellow-300',
      sensitive: 'bg-red-900 text-red-300',
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded ${colors[level] ?? 'bg-gray-700 text-gray-300'}`}
      >
        {level}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 max-w-5xl mx-auto">
      <Head>
        <title>Data Rights – Sovrn</title>
      </Head>

      <h1 className="text-3xl font-bold mb-2">Data Rights Dashboard</h1>
      <p className="text-gray-400 mb-8">
        You control what gets collected and what gets sold. Toggle each module independently.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900 p-6 rounded-xl">
          <p className="text-sm text-gray-400">Current Monthly Estimate</p>
          <p className="text-3xl font-bold text-green-400">
            ${(totalMonthlyEstimate / 100).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Based on modules where collect + sell are ON</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-xl">
          <p className="text-sm text-gray-400">Potential Monthly Estimate</p>
          <p className="text-3xl font-bold text-blue-400">
            ${(potentialMonthlyEstimate / 100).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">If all modules were enabled</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => handleExport()}
          disabled={exporting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm"
        >
          {exporting ? 'Exporting...' : 'Export All Data (JSON)'}
        </button>
      </div>

      <div className="space-y-4">
        {modules.map((m) => {
          const perm = permissions[m.key];
          const ec = eventCounts[m.key];
          const valueCents = values[m.key] ?? 0;
          const isCollecting = perm?.can_collect ?? false;
          const isSelling = perm?.can_sell ?? false;
          const isSavingThis = saving === m.key;
          const isDeletingThis = deleting === m.key;

          return (
            <div key={m.key} className="bg-gray-900 p-5 rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{m.name}</h3>
                    {privacyBadge(m.privacy_level)}
                  </div>
                  <p className="text-sm text-gray-400">{m.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Est. value</p>
                  <p className="text-lg font-bold text-green-400">
                    ${(valueCents / 100).toFixed(2)}/mo
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCollecting}
                    onChange={(e) => togglePermission(m.key, 'can_collect', e.target.checked)}
                    disabled={isSavingThis}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Collect</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelling}
                    onChange={(e) => togglePermission(m.key, 'can_sell', e.target.checked)}
                    disabled={isSavingThis || !isCollecting}
                    className="w-4 h-4 rounded disabled:opacity-40"
                  />
                  <span className={`text-sm ${!isCollecting ? 'text-gray-600' : ''}`}>
                    Sell
                  </span>
                </label>

                {isSavingThis && <span className="text-xs text-gray-500">Saving...</span>}
              </div>

              {!isCollecting && isSelling === false && (
                <p className="text-xs text-gray-600 mb-2">
                  You're missing out on ${(valueCents / 100).toFixed(2)}/mo by keeping this off.
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div>
                  {ec ? (
                    <span>
                      {ec.count} events · Last:{' '}
                      {ec.last_event
                        ? new Date(ec.last_event).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  ) : (
                    <span>No events yet</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleExport(m.key)}
                    disabled={exporting}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => handleDelete(m.key)}
                    disabled={isDeletingThis}
                    className="text-red-400 hover:text-red-300"
                  >
                    {isDeletingThis ? 'Deleting...' : 'Delete Data'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-gray-900 rounded-xl text-center">
        <p className="text-sm text-gray-400">
          Your data is always anonymized before inclusion in pooled datasets.
          We never sell individual records. Toggle "Sell" off at any time to stop
          earning — your data stays private while still being collected for your use.
        </p>
      </div>
    </div>
  );
}

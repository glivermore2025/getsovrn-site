import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { getUserListings } from '../utils/fetchListings';
import { useAuth } from '../lib/authContext';
import ContributionStatusCard from '../components/consumer/ContributionStatusCard';
import ConsentCategoryCard from '../components/consumer/ConsentCategoryCard';
import { normalizeDeviceEventForSnapshot, getEventSummary, getColumnsForModule, getModuleLabel, NormalizedDeviceEvent } from '../lib/normalizeDeviceEvent';

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

type EventCount = {
  module_key: string;
  count: number;
  last_event: string | null;
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'device' | 'rights' | 'seller' | 'buyer'>('device');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [buyerOptIns, setBuyerOptIns] = useState<any[]>([]);
  const [myBuyerPosts, setMyBuyerPosts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const [devices, setDevices] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<NormalizedDeviceEvent[]>([]);
  const [marketplaceReadiness, setMarketplaceReadiness] = useState<any[]>([]);
  const [demographics, setDemographics] = useState<any>(null);
  const [consent, setConsent] = useState<any>(null);
  const [deviceDataLoading, setDeviceDataLoading] = useState(true);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [savingApprovals, setSavingApprovals] = useState(false);
  const [approvalMsg, setApprovalMsg] = useState('');

  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [values, setValues] = useState<Record<string, number>>({});
  const [eventCounts, setEventCounts] = useState<Record<string, EventCount>>({});
  const [rightsLoading, setRightsLoading] = useState(true);
  const [rightsSaving, setRightsSaving] = useState<string | null>(null);
  const [rightsExporting, setRightsExporting] = useState(false);
  const [rightsDeleting, setRightsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchListings = async () => {
      const fetched = await getUserListings(user.id);
      setListings(fetched);
    };
    fetchListings();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchOptIns = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('buyer_post_optins')
        .select(`
          buyer_post_id,
          buyer_posts ( title, description, budget, tags )
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        const cleaned = data.map((optin: any) => ({
          id: optin.buyer_post_id,
          ...optin.buyer_posts,
        }));
        setBuyerOptIns(cleaned);
      }
    };
    fetchOptIns();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchMyPosts = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('buyer_posts')
        .select(`
          id,
          title,
          description,
          budget,
          tags,
          buyer_post_optins (
            user_id,
            profiles ( email )
          )
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        setMyBuyerPosts(data);
      }
    };
    fetchMyPosts();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchDeviceData = async () => {
      setDeviceDataLoading(true);
      const supabase = getSupabaseClient();

      const [devRes, eventsRes, demoRes, consentRes, readinessRes] = await Promise.all([
        supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', user.id)
          .order('last_seen_at', { ascending: false }),
        supabase
          .from('device_events')
          .select('id, module_key, captured_at, payload_json, consent_version, can_sell_snapshot, device_install_id')
          .eq('user_id', user.id)
          .order('captured_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_demographics')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('consent_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('dataset_connectivity_daily')
          .select('date, sellable, uptime_pct, disconnect_count, primary_network, carrier, platform, created_at')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(10),
      ]);

      setDevices(devRes.data || []);
      
      // Normalize device_events into a format suitable for display
      const normalized = (eventsRes.data || []).map(normalizeDeviceEventForSnapshot);
      setRecentEvents(normalized);
      
      setMarketplaceReadiness(readinessRes.data || []);
      setDemographics(demoRes.data || null);
      setConsent(consentRes.data || null);

      const initApprovals: Record<string, boolean> = {};
      if (consentRes.data) {
        initApprovals['device_info'] = consentRes.data.device_info ?? false;
        initApprovals['demographics'] = consentRes.data.demographics ?? false;
        initApprovals['usage_telemetry'] = consentRes.data.usage_telemetry ?? false;
      }
      setApprovals(initApprovals);

      setDeviceDataLoading(false);
    };
    fetchDeviceData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadRightsData();
  }, [user]);

  const loadRightsData = async () => {
    if (!user) return;
    setRightsLoading(true);
    const supabase = getSupabaseClient();

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

    setRightsLoading(false);
  };

  const toggleApproval = (key: string) => {
    setApprovals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveApprovals = async () => {
    if (!user) return;
    setSavingApprovals(true);
    setApprovalMsg('');
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('consent_preferences')
      .upsert({
        user_id: user.id,
        device_info: approvals['device_info'] ?? false,
        demographics: approvals['demographics'] ?? false,
        usage_telemetry: approvals['usage_telemetry'] ?? false,
        updated_at: new Date().toISOString(),
      });
    setSavingApprovals(false);
    if (error) {
      setApprovalMsg('Failed to save. Please try again.');
    } else {
      setApprovalMsg('Marketplace preferences saved.');
      setConsent({
        ...consent,
        device_info: approvals['device_info'] ?? false,
        demographics: approvals['demographics'] ?? false,
        usage_telemetry: approvals['usage_telemetry'] ?? false,
      });
    }
  };

  const togglePermission = async (
    moduleKey: string,
    field: 'can_collect' | 'can_sell',
    value: boolean
  ) => {
    if (!user) return;
    setRightsSaving(moduleKey);
    const supabase = getSupabaseClient();

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
    setRightsSaving(null);
  };

  const handleRightsExport = async (moduleKey?: string) => {
    if (!user) return;
    setRightsExporting(true);
    try {
      const supabase = getSupabaseClient();
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
    setRightsExporting(false);
  };

  const handleRightsDelete = async (moduleKey: string) => {
    if (!user) return;
    const confirmed = window.confirm(
      `This will permanently delete ALL your "${moduleKey}" data. This cannot be undone. Continue?`
    );
    if (!confirmed) return;

    setRightsDeleting(moduleKey);
    try {
      const supabase = getSupabaseClient();
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
    setRightsDeleting(null);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!file || !user) {
      setError('Please upload a file and make sure you are logged in.');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;

    const supabase = getSupabaseClient();
    const { error: uploadError } = await supabase.storage
      .from('datasets')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setError('File upload failed.');
      return;
    }

    const { error: insertError } = await supabase.from('listings').insert([{
      user_id: user.id,
      title,
      description,
      price: parseFloat(price),
      tags: tags.split(',').map((t) => t.trim()),
      file_path: fileName,
    }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      setError('Failed to save listing.');
      return;
    }

    setTitle('');
    setDescription('');
    setPrice('');
    setTags('');
    setFile(null);
    setError('');
    const updatedListings = await getUserListings(user.id);
    setListings(updatedListings);
  };

  const handlePreview = async (path: string) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from('datasets').download(path);
    if (error || !data) return alert('Failed to load file.');

    const text = await data.text();
    const parsed = Papa.parse(text, { header: true });

    setPreviewData({
      file: path,
      rows: parsed.data.length,
      columns: parsed.meta.fields?.length || 0,
      headers: parsed.meta.fields || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (listingId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    const supabase = getSupabaseClient();
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id')
      .eq('listing_id', listingId);

    if (purchases && purchases.length > 0) {
      alert('This listing cannot be deleted because purchases exist.');
      return;
    }

    await supabase.storage.from('datasets').remove([filePath]);

    await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)
      .eq('user_id', user.id);

    const updated = await getUserListings(user.id);
    setListings(updated);
  };

  const handleOptOut = async (postId: string) => {
    if (!confirm('Are you sure you want to opt out of this post?')) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('buyer_post_optins')
      .delete()
      .eq('buyer_post_id', postId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to opt out:', error);
      alert('Failed to opt out of this post.');
      return;
    }

    const { data: updated } = await supabase
      .from('buyer_post_optins')
      .select(`
        buyer_post_id,
        buyer_posts ( title, description, budget, tags )
      `)
      .eq('user_id', user.id);

    if (updated) {
      const cleaned = updated.map((optin: any) => ({
        id: optin.buyer_post_id,
        ...optin.buyer_posts,
      }));
      setBuyerOptIns(cleaned);
    }
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

  // Count events by module from recentEvents
  const eventsByModule = recentEvents.reduce((acc: Record<string, number>, event) => {
    acc[event.module_key] = (acc[event.module_key] || 0) + 1;
    return acc;
  }, {});

  const contributionLabel = recentEvents.length > 0 ? 'Active contributor' : 'No contributions yet';
  const latestSnapshotDate = recentEvents.length > 0 ? new Date(recentEvents[0].captured_at).toLocaleDateString() : 'Not synced';
  const contributionCategories = modules.filter(
    (m) => permissions[m.key]?.can_collect || permissions[m.key]?.can_sell
  ).length;
  const marketplaceStatus = listings.length > 0 ? 'Marketplace participation active' : 'Not participating yet';

  const tabs: { key: 'device' | 'rights' | 'seller' | 'buyer'; label: string }[] = [
    { key: 'device', label: 'My Data' },
    { key: 'rights', label: 'Permissions' },
    { key: 'seller', label: 'Listings' },
    { key: 'buyer', label: 'Requests' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <Head><title>Dashboard – Sovrn</title></Head>

      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-400 text-sm mb-8">Review your consented contributions, manage data permissions, and see how your opted-in signals are used in the marketplace.</p>

      {authLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
        </div>
      ) : !user ? (
        <div className="mx-auto max-w-2xl rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-300">Account required</p>
          <h2 className="mt-3 text-2xl font-semibold">Sign in to view your data dashboard.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-400">
            Your dashboard only shows live contribution status, permissions, and marketplace activity after you sign in.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Sign In
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-medium text-gray-200 transition-colors hover:border-blue-400 hover:text-blue-300"
            >
              Join Waitlist
            </Link>
          </div>
        </div>
      ) : (
        <>
      <div className="mb-8 rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-300">Next steps</p>
            <h2 className="mt-1 text-xl font-semibold">Get your account marketplace-ready.</h2>
            <p className="mt-1 text-sm text-gray-300">
              Connect the mobile app, choose data permissions, then review what is ready for buyer-safe datasets.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setActiveTab('device')}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-blue-700"
            >
              Connect mobile app
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rights')}
              className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:border-blue-400 hover:text-blue-300"
            >
              Manage permissions
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <ContributionStatusCard
          title="Contribution status"
          value={contributionLabel}
          description={`Last sync: ${latestSnapshotDate}`}
        />
        <ContributionStatusCard
          title="Data categories"
          value={`${contributionCategories} enabled`}
          description="Choose what you share and what stays private."
        />
        <ContributionStatusCard
          title="Estimated value"
          value={`$${(totalMonthlyEstimate / 100).toFixed(2)}/mo`}
          description="Estimated value from active consented data categories."
        />
        <ContributionStatusCard
          title="Marketplace status"
          value={marketplaceStatus}
          description="Track your contribution visibility for buyers."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <ConsentCategoryCard
          label="Device & Connectivity Data"
          description="Network and device context used in anonymized reports."
          enabled={approvals.device_info ?? false}
        />
        <ConsentCategoryCard
          label="General Location / Mobility Signals"
          description="Aggregated local movement patterns, not raw GPS tracks."
          enabled={permissions.activity_rhythm?.can_collect ?? false}
        />
      </div>

      <div className="flex mb-8 gap-2 border-b border-gray-800 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-900 text-white border border-gray-800 border-b-gray-950 -mb-px'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'device' ? (
        <DeviceDataTab
          devices={devices}
          recentEvents={recentEvents}
          marketplaceReadiness={marketplaceReadiness}
          eventsByModule={eventsByModule}
          demographics={demographics}
          consent={consent}
          loading={deviceDataLoading}
          approvals={approvals}
          toggleApproval={toggleApproval}
          saveApprovals={saveApprovals}
          savingApprovals={savingApprovals}
          approvalMsg={approvalMsg}
          user={user}
        />
      ) : activeTab === 'rights' ? (
        <DataRightsTab
          modules={modules}
          permissions={permissions}
          values={values}
          eventCounts={eventCounts}
          loading={rightsLoading}
          saving={rightsSaving}
          exporting={rightsExporting}
          deleting={rightsDeleting}
          totalMonthlyEstimate={totalMonthlyEstimate}
          potentialMonthlyEstimate={potentialMonthlyEstimate}
          togglePermission={togglePermission}
          handleExport={handleRightsExport}
          handleDelete={handleRightsDelete}
        />
      ) : activeTab === 'seller' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Create New Listing</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input type="text" className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-green-500 focus:outline-none transition-colors" value={title}
                onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-green-500 focus:outline-none transition-colors" value={description}
                onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
              <input type="text" className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-green-500 focus:outline-none transition-colors" value={tags}
                onChange={(e) => setTags(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Price (USD)</label>
              <input type="number" className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-green-500 focus:outline-none transition-colors" value={price}
                onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Upload File</label>
              <input type="file" className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300"
                onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </div>
            <button type="submit" className="bg-green-600 hover:bg-green-700 py-3 px-4 rounded-lg w-full font-medium transition-colors">Submit Listing</button>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </form>

          <div>
            <h2 className="text-xl font-semibold mb-4">Your Listings</h2>
            {listings.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500">No listings yet. Create one to get started.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {listings.map((listing) => (
                  <li key={listing.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold">{listing.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{listing.description}</p>
                    <p className="text-green-400 font-semibold mt-2">${listing.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{listing.tags.join(', ')}</p>
                    <div className="flex gap-4 mt-3">
                      <button onClick={() => handlePreview(listing.file_path)}
                        className="text-blue-400 hover:text-blue-300 text-sm transition-colors">Preview</button>
                      <button onClick={() => handleDelete(listing.id, listing.file_path)}
                        className="text-red-400 hover:text-red-300 text-sm transition-colors">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-semibold mb-4">Posts You Have Opted Into</h2>
            {buyerOptIns.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500">No buyer posts opted into yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {buyerOptIns.map((post) => (
                  <li key={post.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{post.description}</p>
                    <p className="text-green-400 font-semibold mt-2">Budget: ${post.budget.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{post.tags?.join(', ')}</p>
                    <button
                      onClick={() => handleOptOut(post.id)}
                      className="mt-3 bg-red-600/20 text-red-400 hover:bg-red-600/30 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Opt Out
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Your Buyer Posts & Opt-ins</h2>
            {myBuyerPosts.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500">You have not created any buyer posts yet.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {myBuyerPosts.map((post) => (
                  <li key={post.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{post.description}</p>
                    <p className="text-green-400 font-semibold mt-2">Budget: ${post.budget.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{post.tags?.join(', ')}</p>
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-300">Contributors who opted in:</h4>
                      {post.buyer_post_optins.length === 0 ? (
                        <p className="text-gray-500 text-sm mt-1">No contributors have opted in yet.</p>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {post.buyer_post_optins.map((opt: any) => (
                            <li key={opt.user_id} className="text-sm text-gray-300">
                              {opt.profiles?.email || opt.user_id}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {showModal && previewData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-2xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Data Preview</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-400">File:</span> {previewData.file}</p>
              <p><span className="text-gray-400">Columns:</span> {previewData.columns}</p>
              <p><span className="text-gray-400">Rows:</span> {previewData.rows}</p>
              <p><span className="text-gray-400">Headers:</span> {previewData.headers.join(', ')}</p>
            </div>
            <button onClick={() => setShowModal(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg mt-6 w-full transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DataRightsTab({
  modules,
  permissions,
  values,
  eventCounts,
  loading,
  saving,
  exporting,
  deleting,
  totalMonthlyEstimate,
  potentialMonthlyEstimate,
  togglePermission,
  handleExport,
  handleDelete,
}: {
  modules: Module[];
  permissions: Record<string, Permission>;
  values: Record<string, number>;
  eventCounts: Record<string, EventCount>;
  loading: boolean;
  saving: string | null;
  exporting: boolean;
  deleting: string | null;
  totalMonthlyEstimate: number;
  potentialMonthlyEstimate: number;
  togglePermission: (moduleKey: string, field: 'can_collect' | 'can_sell', value: boolean) => void;
  handleExport: (moduleKey?: string) => void;
  handleDelete: (moduleKey: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const privacyBadge = (level: string) => {
    const colors: Record<string, string> = {
      standard: 'bg-green-900/50 text-green-400',
      elevated: 'bg-yellow-900/50 text-yellow-400',
      sensitive: 'bg-red-900/50 text-red-400',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[level] ?? 'bg-gray-700 text-gray-300'}`}>
        {level}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <p className="text-sm text-gray-400">Current Monthly Estimate</p>
          <p className="text-3xl font-bold text-green-400 mt-1">
            ${(totalMonthlyEstimate / 100).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Based on modules where collect + share are ON</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <p className="text-sm text-gray-400">Potential Monthly Estimate</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">
            ${(potentialMonthlyEstimate / 100).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">If all modules were enabled</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleExport()}
          disabled={exporting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
            <div key={m.key} className="bg-gray-900 border border-gray-800 p-5 rounded-xl">
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
                    className="w-4 h-4 rounded accent-green-500"
                  />
                  <span className="text-sm">Collect</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelling}
                    onChange={(e) => togglePermission(m.key, 'can_sell', e.target.checked)}
                    disabled={isSavingThis || !isCollecting}
                    className="w-4 h-4 rounded accent-green-500 disabled:opacity-40"
                  />
                  <span className={`text-sm ${!isCollecting ? 'text-gray-600' : ''}`}>
                    Share
                  </span>
                </label>

                {isSavingThis && <span className="text-xs text-gray-500">Saving...</span>}
              </div>

              {!isCollecting && !isSelling && valueCents > 0 && (
                <p className="text-xs text-gray-500 mb-2">
                  You&apos;re missing out on ${(valueCents / 100).toFixed(2)}/mo by keeping this off.
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-800">
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
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => handleDelete(m.key)}
                    disabled={isDeletingThis}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    {isDeletingThis ? 'Deleting...' : 'Delete Data'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl text-center">
        <p className="text-sm text-gray-400">
          Your data is always anonymized before inclusion in pooled datasets.
          Buyers receive aggregated outputs, not individual records. Toggle &quot;Share&quot; off at any time to stop
          marketplace participation while still collecting data for your use.
        </p>
      </div>
    </div>
  );
}

function DeviceDataTab({
  devices,
  recentEvents,
  marketplaceReadiness,
  eventsByModule,
  demographics,
  consent,
  loading,
  approvals,
  toggleApproval,
  saveApprovals,
  savingApprovals,
  approvalMsg,
  user,
}: {
  devices: any[];
  recentEvents: NormalizedDeviceEvent[];
  marketplaceReadiness: any[];
  eventsByModule: Record<string, number>;
  demographics: any;
  consent: any;
  loading: boolean;
  approvals: Record<string, boolean>;
  toggleApproval: (key: string) => void;
  saveApprovals: () => void;
  savingApprovals: boolean;
  approvalMsg: string;
  user: any;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  const handleRefreshMarketplaceData = async () => {
    if (!user) return;
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const response = await fetch('/api/user/refresh-my-connectivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const error = await response.json();
        setRefreshMsg(`Refresh failed: ${error.error}`);
      } else {
        setRefreshMsg('Marketplace data refreshed successfully!');
        // Optionally reload the page or re-fetch the data
        setTimeout(() => setRefreshMsg(''), 3000);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      setRefreshMsg('Failed to refresh marketplace data.');
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const hasAnyData = devices.length > 0 || recentEvents.length > 0 || demographics;

  if (!hasAnyData) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">📱</div>
        <h3 className="text-xl font-semibold mb-2">No device data yet</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Install the Sovrn mobile app and sync your device to see your data here.
          You&apos;ll be able to review everything before approving it for the marketplace.
        </p>
      </div>
    );
  }

  // Update approval items to use module-based event counts
  const approvalItems = [
    {
      key: 'device_info',
      label: 'Device Info',
      description: 'Model, OS, screen size, battery snapshots',
      dataPoints: eventsByModule['device_health'] || 0,
    },
    {
      key: 'demographics',
      label: 'Demographics',
      description: 'Age range, industry, region, household size',
      dataPoints: demographics ? 1 : 0,
    },
    {
      key: 'usage_telemetry',
      label: 'Connectivity & Usage',
      description: 'Network type, connectivity status',
      dataPoints: eventsByModule['connectivity'] || 0,
    },
  ];

  // Group recent events by module for display
  const eventsByModuleList: { module: string; events: NormalizedDeviceEvent[] }[] = [];
  const moduleCounts: Record<string, NormalizedDeviceEvent[]> = {};
  recentEvents.forEach((event) => {
    if (!moduleCounts[event.module_key]) {
      moduleCounts[event.module_key] = [];
    }
    moduleCounts[event.module_key].push(event);
  });
  Object.entries(moduleCounts).forEach(([module, events]) => {
    eventsByModuleList.push({ module, events });
  });

  const connectivityEventsCount = eventsByModule['connectivity'] || 0;
  const connectivitySellableCount = recentEvents.filter((e) => e.module_key === 'connectivity' && e.can_sell_snapshot).length;
  const lastConnectivityDate = recentEvents
    .filter((e) => e.module_key === 'connectivity')
    .map((e) => new Date(e.captured_at))
    .sort((a, b) => b.getTime() - a.getTime())[0]
    ?.toLocaleDateString() || 'N/A';

  const marketplaceReady = marketplaceReadiness.length > 0;
  const lastReadinessDate = marketplaceReady
    ? new Date(marketplaceReadiness[0].date).toLocaleDateString()
    : 'Not yet';

  return (
    <div className="space-y-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Marketplace Approval</h2>
            <p className="text-sm text-gray-400 mt-1">Choose which data categories to include in anonymized, aggregated marketplace pools.</p>
          </div>
        </div>

        <div className="space-y-3">
          {approvalItems.map((item) => (
            <div
              key={item.key}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                approvals[item.key]
                  ? 'bg-green-500/5 border-green-500/30'
                  : 'bg-gray-800/50 border-gray-700/50'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">{item.label}</h3>
                  {item.dataPoints > 0 && (
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                      {item.dataPoints} {item.dataPoints === 1 ? 'record' : 'records'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>
              </div>
              <button
                onClick={() => toggleApproval(item.key)}
                className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                  approvals[item.key] ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow ${
                    approvals[item.key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
          <div>
            {approvalMsg && (
              <p className={`text-sm ${approvalMsg.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                {approvalMsg}
              </p>
            )}
          </div>
          <button
            onClick={saveApprovals}
            disabled={savingApprovals}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {savingApprovals ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Registered Devices</h2>
        {devices.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-500">No devices registered.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {devices.map((d: any) => (
              <div key={d.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg">
                      {d.device_platform === 'ios' ? '🍎' : '🤖'}
                    </div>
                    <div>
                      <p className="font-medium">{d.model || d.device_model || 'Unknown Device'}</p>
                      <p className="text-sm text-gray-400">
                        {d.os_name} {d.os_version} · {d.device_platform}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Active
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {d.last_seen_at ? new Date(d.last_seen_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {demographics && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Demographics</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {demographics.age_range && (
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-3 text-gray-400">Age Range</td>
                    <td className="px-4 py-3 text-right font-medium">{demographics.age_range}</td>
                  </tr>
                )}
                {demographics.industry && (
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-3 text-gray-400">Industry</td>
                    <td className="px-4 py-3 text-right font-medium">{demographics.industry}</td>
                  </tr>
                )}
                {demographics.region && (
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-3 text-gray-400">Region</td>
                    <td className="px-4 py-3 text-right font-medium">{demographics.region}</td>
                  </tr>
                )}
                {demographics.household_size && (
                  <tr className="border-b border-gray-800">
                    <td className="px-4 py-3 text-gray-400">Household Size</td>
                    <td className="px-4 py-3 text-right font-medium">{demographics.household_size}</td>
                  </tr>
                )}
                {demographics.devices_owned && demographics.devices_owned.length > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-gray-400">Devices Owned</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {demographics.devices_owned.map((d: string) => (
                          <span key={d} className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full">{d}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Marketplace Readiness</h2>
            <p className="text-sm text-gray-400 mt-1">Shows whether your connectivity data has been transformed into buyer-ready aggregated datasets.</p>
          </div>
          <button
            onClick={handleRefreshMarketplaceData}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>

        {refreshMsg && (
          <p className={`text-sm mb-4 ${refreshMsg.includes('failed') || refreshMsg.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
            {refreshMsg}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400">Connectivity Events</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{connectivityEventsCount}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400">Eligible</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{connectivitySellableCount}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400">Last Event</p>
            <p className="text-sm text-gray-300 mt-1">{lastConnectivityDate}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400">Buyer Ready</p>
            <p className={`text-sm font-semibold mt-1 ${marketplaceReady ? 'text-green-400' : 'text-gray-500'}`}>
              {marketplaceReady ? 'Yes ✓' : 'Pending'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{lastReadinessDate}</p>
          </div>
        </div>

        {marketplaceReady && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-300">
              ✓ Your connectivity data is ready! Buyers can preview and purchase aggregated datasets from your contributed data.
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Events</h2>
          <span className="text-xs text-gray-500">{recentEvents.length} records</span>
        </div>
        {recentEvents.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-500">No events synced yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {eventsByModuleList.map(({ module, events }) => {
              const columns = getColumnsForModule(module);
              return (
                <div key={module} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800">
                    <h3 className="font-semibold">{getModuleLabel(module)}</h3>
                    <p className="text-xs text-gray-500">{events.length} events</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-left bg-gray-900">
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Summary</th>
                          {columns.slice(0, 2).map((col) => (
                            <th key={col.key} className="px-4 py-3 font-medium">{col.label}</th>
                          ))}
                          <th className="px-4 py-3 font-medium">Eligible</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.slice(0, 10).map((e, i) => (
                          <tr key={e.id || i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-3 text-gray-300">
                              {new Date(e.captured_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {getEventSummary(e)}
                            </td>
                            {columns.slice(0, 2).map((col) => (
                              <td key={col.key} className="px-4 py-3 text-gray-300">
                                {col.value(e) || '—'}
                              </td>
                            ))}
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                e.can_sell_snapshot
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-700 text-gray-400'
                              }`}>
                                {e.can_sell_snapshot ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {events.length > 10 && (
                    <div className="px-4 py-3 bg-gray-800/30 text-center border-t border-gray-800">
                      <p className="text-xs text-gray-500">+{events.length - 10} more events</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

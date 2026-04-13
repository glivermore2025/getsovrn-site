import Head from 'next/head';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { getUserListings } from '../utils/fetchListings';
import { useAuth } from '../lib/authContext';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'device' | 'seller' | 'buyer'>('device');

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
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [demographics, setDemographics] = useState<any>(null);
  const [consent, setConsent] = useState<any>(null);
  const [deviceDataLoading, setDeviceDataLoading] = useState(true);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [savingApprovals, setSavingApprovals] = useState(false);
  const [approvalMsg, setApprovalMsg] = useState('');

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

      const [devRes, snapRes, demoRes, consentRes] = await Promise.all([
        supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', user.id)
          .order('last_seen_at', { ascending: false }),
        supabase
          .from('device_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .order('collected_at', { ascending: false })
          .limit(20),
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
      ]);

      setDevices(devRes.data || []);
      setSnapshots(snapRes.data || []);
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

  const tabs: { key: 'device' | 'seller' | 'buyer'; label: string }[] = [
    { key: 'device', label: 'My Device Data' },
    { key: 'seller', label: 'Seller' },
    { key: 'buyer', label: 'Buyer' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head><title>Dashboard – Sovrn</title></Head>

      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-400 text-sm mb-8">Review your synced data and manage marketplace listings.</p>

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

      {authLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
        </div>
      ) : !user ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">Sign in to view your dashboard.</p>
        </div>
      ) : activeTab === 'device' ? (
        <DeviceDataTab
          devices={devices}
          snapshots={snapshots}
          demographics={demographics}
          consent={consent}
          loading={deviceDataLoading}
          approvals={approvals}
          toggleApproval={toggleApproval}
          saveApprovals={saveApprovals}
          savingApprovals={savingApprovals}
          approvalMsg={approvalMsg}
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
                      <h4 className="text-sm font-semibold text-gray-300">Sellers who opted in:</h4>
                      {post.buyer_post_optins.length === 0 ? (
                        <p className="text-gray-500 text-sm mt-1">No sellers have opted in yet.</p>
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

function DeviceDataTab({
  devices,
  snapshots,
  demographics,
  consent,
  loading,
  approvals,
  toggleApproval,
  saveApprovals,
  savingApprovals,
  approvalMsg,
}: {
  devices: any[];
  snapshots: any[];
  demographics: any;
  consent: any;
  loading: boolean;
  approvals: Record<string, boolean>;
  toggleApproval: (key: string) => void;
  saveApprovals: () => void;
  savingApprovals: boolean;
  approvalMsg: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const hasAnyData = devices.length > 0 || snapshots.length > 0 || demographics;

  if (!hasAnyData) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">📱</div>
        <h3 className="text-xl font-semibold mb-2">No device data yet</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Install the Sovrn mobile app and sync your device to see your data here.
          You'll be able to review everything before approving it for the marketplace.
        </p>
      </div>
    );
  }

  const approvalItems = [
    {
      key: 'device_info',
      label: 'Device Info',
      description: 'Model, OS, screen size, battery snapshots',
      dataPoints: snapshots.length,
    },
    {
      key: 'demographics',
      label: 'Demographics',
      description: 'Age range, industry, region, household size',
      dataPoints: demographics ? 1 : 0,
    },
    {
      key: 'usage_telemetry',
      label: 'Usage Telemetry',
      description: 'Network type, charging patterns',
      dataPoints: snapshots.length,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Marketplace Approval</h2>
            <p className="text-sm text-gray-400 mt-1">Choose which data categories to make available for sale in anonymized pools.</p>
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

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Snapshots</h2>
          <span className="text-xs text-gray-500">{snapshots.length} records</span>
        </div>
        {snapshots.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-500">No snapshots synced yet.</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Battery</th>
                    <th className="px-4 py-3 font-medium">Charging</th>
                    <th className="px-4 py-3 font-medium">Network</th>
                    <th className="px-4 py-3 font-medium">Screen</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s: any, i: number) => (
                    <tr key={s.id || i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 text-gray-300">
                        {s.collected_at ? new Date(s.collected_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {s.battery_level != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  s.battery_level > 0.5 ? 'bg-green-500' :
                                  s.battery_level > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.round(s.battery_level * 100)}%` }}
                              />
                            </div>
                            <span className="text-gray-300">{Math.round(s.battery_level * 100)}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {s.is_charging != null ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            s.is_charging
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            {s.is_charging ? 'Yes' : 'No'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{s.network_type || '—'}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {s.screen_width && s.screen_height
                          ? `${s.screen_width}×${s.screen_height}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

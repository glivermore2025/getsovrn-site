import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getSupabaseClient } from '../../lib/supabaseClient';

type Dataset = {
  id: string;
  name: string;
  description?: string | null;
  unit_price_cents: number;
};

type PreviewRow = {
  date: string;
  platform: string;
  carrier: string;
  primary_network: string;
  disconnect_count: number;
  uptime_pct: number;
};

type PreviewResponse = {
  rows: PreviewRow[];
  totalCount: number;
};

const parseCsv = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default function DataPurchasingPage() {
  const supabase = getSupabaseClient();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [platforms, setPlatforms] = useState('ios,android');
  const [carriers, setCarriers] = useState('Verizon,AT&T');
  const [networkTypes, setNetworkTypes] = useState('wifi,cellular');
  const [uptimeMin, setUptimeMin] = useState(70);
  const [uptimeMax, setUptimeMax] = useState(100);
  const [disconnectMin, setDisconnectMin] = useState(0);
  const [disconnectMax, setDisconnectMax] = useState(20);
  const [limit, setLimit] = useState(100);

  const estimatedPrice = useMemo(() => {
    if (!dataset) return null;
    return ((dataset.unit_price_cents / 100) * totalCount).toFixed(2);
  }, [dataset, totalCount]);

  const filters = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    platforms: parseCsv(platforms),
    carriers: parseCsv(carriers),
    networkTypes: parseCsv(networkTypes),
    uptimeMin,
    uptimeMax,
    disconnectMin,
    disconnectMax,
    limit,
  };

  const fetchDataset = async () => {
    const { data, error } = await supabase
      .from('datasets')
      .select('id, name, description, unit_price_cents')
      .eq('slug', 'connectivity')
      .maybeSingle();

    if (!error && data) {
      setDataset(data as Dataset);
    }
  };

  const refreshPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<PreviewResponse>(
        '/api/buyer/datasets/connectivity/preview',
        filters
      );
      setRows(response.data.rows);
      setTotalCount(response.data.totalCount);
    } catch (err: any) {
      console.error('Preview error:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to fetch preview.');
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataset();
    refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async () => {
    if (!dataset) {
      alert('Dataset not found.');
      return;
    }

    if (totalCount <= 0) {
      alert('No sellable rows match the current filters.');
      return;
    }

    setBuying(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Please log in to purchase access.');
        return;
      }

      const { data } = await axios.post('/api/checkout_sessions', {
        datasetId: dataset.id,
        userId: user.id,
        quantity: totalCount,
        filterJson: filters,
      });

      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Purchase error:', err);
      alert(err?.response?.data?.error || err.message || 'Failed to start checkout.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Data Purchasing – Sovrn</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Data Purchasing</h1>
              <p className="mt-2 text-gray-400 max-w-2xl">
                Browse sellable daily connectivity summaries and price the exact filter slice you want.
              </p>
            </div>
            <div className="rounded-2xl bg-gray-800 p-4 text-right">
              <p className="text-sm text-gray-400">Sellable rows</p>
              <p className="text-3xl font-semibold">{loading ? '…' : totalCount}</p>
              {estimatedPrice != null && (
                <p className="text-sm text-gray-400">Estimated price: ${estimatedPrice}</p>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-xl font-semibold mb-4">Filters</h2>

            <label className="block text-sm text-gray-300 mb-1">Date From</label>
            <input
              type="date"
              className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />

            <label className="block text-sm text-gray-300 mt-4 mb-1">Date To</label>
            <input
              type="date"
              className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />

            <label className="block text-sm text-gray-300 mt-4 mb-1">Platforms (comma separated)</label>
            <input
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
              value={platforms}
              onChange={(event) => setPlatforms(event.target.value)}
            />

            <label className="block text-sm text-gray-300 mt-4 mb-1">Carriers (comma separated)</label>
            <input
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
              value={carriers}
              onChange={(event) => setCarriers(event.target.value)}
            />

            <label className="block text-sm text-gray-300 mt-4 mb-1">Network Types (comma separated)</label>
            <input
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
              value={networkTypes}
              onChange={(event) => setNetworkTypes(event.target.value)}
            />

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Uptime Min</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
                  value={uptimeMin}
                  onChange={(event) => setUptimeMin(Number(event.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Uptime Max</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
                  value={uptimeMax}
                  onChange={(event) => setUptimeMax(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Disconnect Min</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
                  value={disconnectMin}
                  onChange={(event) => setDisconnectMin(Number(event.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Disconnect Max</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
                  value={disconnectMax}
                  onChange={(event) => setDisconnectMax(Number(event.target.value))}
                />
              </div>
            </div>

            <label className="block text-sm text-gray-300 mt-4 mb-1">Preview limit</label>
            <input
              type="number"
              min={1}
              max={500}
              className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            />

            <button
              type="button"
              onClick={refreshPreview}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-500 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh Preview'}
            </button>
          </aside>

          <main className="space-y-6">
            <section className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Preview</h2>
                  <p className="text-gray-400">Query the transformed daily connectivity dataset and inspect the matching rows.</p>
                </div>
                <button
                  onClick={handlePurchase}
                  disabled={buying || loading || totalCount <= 0 || !dataset}
                  className="rounded-xl bg-green-600 px-4 py-3 text-white hover:bg-green-500 disabled:opacity-60"
                >
                  {buying ? 'Purchasing…' : 'Purchase Dataset'}
                </button>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl border border-red-500 bg-red-950 p-4 text-sm text-red-200">{error}</p>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Dataset</p>
                  <p className="mt-2 text-lg font-semibold">{dataset?.name ?? 'Connectivity'}</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Rows</p>
                  <p className="mt-2 text-lg font-semibold">{loading ? '…' : totalCount}</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Estimate</p>
                  <p className="mt-2 text-lg font-semibold">{estimatedPrice ? `$${estimatedPrice}` : 'TBD'}</p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-3xl border border-gray-800 bg-gray-950">
                <table className="min-w-full border-collapse text-left text-sm text-white">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Platform</th>
                      <th className="px-4 py-3 font-medium">Carrier</th>
                      <th className="px-4 py-3 font-medium">Network</th>
                      <th className="px-4 py-3 font-medium">Disconnects</th>
                      <th className="px-4 py-3 font-medium">Uptime %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-400">
                          {loading ? 'Loading preview…' : 'No preview rows match the selected filters.'}
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={`${row.date}-${row.platform}-${row.carrier}`} className="border-t border-gray-800">
                          <td className="px-4 py-3">{row.date}</td>
                          <td className="px-4 py-3">{row.platform || 'unknown'}</td>
                          <td className="px-4 py-3">{row.carrier || 'unknown'}</td>
                          <td className="px-4 py-3">{row.primary_network || 'unknown'}</td>
                          <td className="px-4 py-3">{row.disconnect_count}</td>
                          <td className="px-4 py-3">{row.uptime_pct?.toFixed(2)}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

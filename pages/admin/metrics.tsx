import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { getCurrentUserIsAdmin } from '../../lib/roleAccess';
import { useRouter } from 'next/router';
import { fetchAdminJson } from '../../lib/adminApi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type AdminMetricsPayload = {
  listings: any[];
  transactions: any[];
  users: any[];
};

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<any>({});
  const [rawMetrics, setRawMetrics] = useState<AdminMetricsPayload>({
    listings: [],
    transactions: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user;
      if (!user || !(await getCurrentUserIsAdmin())) {
        router.push('/');
        return;
      }

      fetchMetrics();
    });
  }, []);

  useEffect(() => {
    if (!rawMetrics.listings.length && !rawMetrics.transactions.length && !rawMetrics.users.length) {
      return;
    }
    buildMetrics(rawMetrics);
  }, [startDate, endDate]);

  const buildMetrics = ({ listings, transactions, users }: AdminMetricsPayload) => {
    let filteredTransactions = transactions || [];

    if (startDate) {
      filteredTransactions = filteredTransactions.filter(
        (t) => new Date(t.purchased_at) >= new Date(startDate)
      );
    }
    if (endDate) {
      filteredTransactions = filteredTransactions.filter(
        (t) => new Date(t.purchased_at) <= new Date(endDate)
      );
    }

    const revenue = filteredTransactions.reduce(
      (sum, t) => sum + Number(t.purchase_price || 0),
      0
    );

    const revenueByDay: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      const date = new Date(t.purchased_at).toISOString().split('T')[0];
      revenueByDay[date] = (revenueByDay[date] || 0) + Number(t.purchase_price || 0);
    });

    const chartData = Object.entries(revenueByDay).map(([date, amount]) => ({
      date,
      amount,
    }));

    const topListingsMap: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      topListingsMap[t.listing_id] =
        (topListingsMap[t.listing_id] || 0) + Number(t.purchase_price || 0);
    });
    const topListings = Object.entries(topListingsMap)
      .map(([listing_id, revenue]) => ({ listing_id, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const topBuyersMap: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      topBuyersMap[t.buyer_id] =
        (topBuyersMap[t.buyer_id] || 0) + Number(t.purchase_price || 0);
    });
    const topBuyers = Object.entries(topBuyersMap)
      .map(([buyer_id, revenue]) => ({ buyer_id, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    setMetrics({
      totalListings: listings?.length || 0,
      totalRevenue: revenue.toFixed(2),
      totalUsers: users?.length || 0,
      chartData,
      recentTransactions: filteredTransactions,
      topListings,
      topBuyers,
    });
    setCurrentPage(1);
  };

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminJson<AdminMetricsPayload>('/api/admin/metrics');
      setRawMetrics(data);
      buildMetrics(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const paginatedTransactions = metrics.recentTransactions
    ? metrics.recentTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : [];

  return (
    <div className="text-white p-8 bg-gray-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Metrics Dashboard</h1>

      {loading && <p className="mb-6 text-gray-400">Loading metrics...</p>}
      {error && <p className="mb-6 text-red-400">{error}</p>}

      <div className="bg-gray-800 p-4 rounded mb-8 flex gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-gray-900 p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-gray-900 p-2 rounded"
          />
        </div>
        <button
          onClick={() => buildMetrics(rawMetrics)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Apply Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gray-800 p-6 rounded">
          <h2 className="text-lg font-semibold">Total Listings</h2>
          <p className="text-2xl">{metrics.totalListings ?? 0}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded">
          <h2 className="text-lg font-semibold">Total Users</h2>
          <p className="text-2xl">{metrics.totalUsers ?? 0}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded">
          <h2 className="text-lg font-semibold">Total Revenue</h2>
          <p className="text-2xl">${metrics.totalRevenue ?? '0.00'}</p>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded">
        <h2 className="text-lg font-semibold mb-4">Revenue Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.chartData ?? []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="amount" stroke="#38bdf8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gray-800 p-6 rounded mt-10">
        <h2 className="text-lg font-semibold mb-4">Top Selling Listings</h2>
        <ul>
          {metrics.topListings?.map((l: any) => (
            <li key={l.listing_id} className="mb-2">
              {l.listing_id}: ${l.revenue.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-800 p-6 rounded mt-10">
        <h2 className="text-lg font-semibold mb-4">Top Buyers</h2>
        <ul>
          {metrics.topBuyers?.map((buyer: any) => (
            <li key={buyer.buyer_id} className="mb-2">
              {buyer.buyer_id}: ${buyer.revenue.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-800 p-6 rounded mt-10">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2">Buyer</th>
              <th className="p-2">Listing</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((tx: any) => (
              <tr key={tx.id} className="border-b border-gray-700">
                <td className="p-2">{tx.buyer_id}</td>
                <td className="p-2">{tx.listing_id}</td>
                <td className="p-2">${Number(tx.purchase_price ?? 0).toFixed(2)}</td>
                <td className="p-2">
                  {tx.purchased_at ? new Date(tx.purchased_at).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {metrics.recentTransactions?.length > pageSize && (
          <div className="mt-4 flex justify-between">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="bg-gray-700 px-3 py-1 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {currentPage}</span>
            <button
              disabled={currentPage * pageSize >= metrics.recentTransactions.length}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="bg-gray-700 px-3 py-1 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { ADMIN_USER_IDS } from '../../lib/constants';
import { useRouter } from 'next/router';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function AdminMetrics() {
  const [user, setUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setUser(u);
      if (!u || !ADMIN_USER_IDS.includes(u.id)) {
        router.push('/');
      }
    });
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    const [{ data: listings }, { data: transactions }, { data: users }] =
      await Promise.all([
        supabase.from('listings').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('profiles').select('*'),
      ]);

    let filteredTransactions = transactions || [];

    // Apply date filtering
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
      (sum, t) => sum + (t.purchase_price || 0),
      0
    );

    const revenueByDay: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      const date = new Date(t.purchased_at).toISOString().split('T')[0];
      revenueByDay[date] = (revenueByDay[date] || 0) + (t.purchase_price || 0);
    });

    const chartData = Object.entries(revenueByDay).map(([date, amount]) => ({
      date,
      amount,
    }));

    // Aggregate top-selling listings
    const topListingsMap: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      topListingsMap[t.listing_id] =
        (topListingsMap[t.listing_id] || 0) + (t.purchase_price || 0);
    });
    const topListings = Object.entries(topListingsMap)
      .map(([listing_id, revenue]) => ({ listing_id, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Aggregate top sellers
    const topSellersMap: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      topSellersMap[t.buyer_id] =
        (topSellersMap[t.buyer_id] || 0) + (t.purchase_price || 0);
    });
    const topSellers = Object.entries(topSellersMap)
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
      topSellers,
    });
    setCurrentPage(1); // Reset pagination on new fetch
  };

  const paginatedTransactions = metrics.recentTransactions
    ? metrics.recentTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : [];

  return (
    <div className="text-white p-8 bg-gray-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Metrics Dashboard</h1>

      {/* Filters */}
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
          onClick={fetchMetrics}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Apply Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gray-800 p-6 rounded">
          <h2 className="text-lg font-semibold">Total Listings</h2>
          <p className="text-2xl">{metrics.totalListings}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded">
          <h2 className="text-lg font-semibold">Total Users</h2>
          <p className="text-2xl">{metrics.totalUsers}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded">
          <h2 className="text-lg font-semibold">Total Revenue</h2>
          <p className="text-2xl">${metrics.totalRevenue}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-gray-800 p-6 rounded">
        <h2 className="text-lg font-semibold mb-4">Revenue Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="amount" stroke="#38bdf8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Selling Listings */}
      <div className="bg-gray-800 p-6 rounded mt-10">
        <h2 className="text-lg font-semibold mb-4">Top Selling Listings</h2>
        <ul>
          {metrics.topListings?.map((l: any, i: number) => (
            <li key={i} className="mb-2">
              {l.listing_id}: ${l.revenue.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      {/* Top Sellers */}
      <div className="bg-gray-800 p-6 rounded mt-10">
        <h2 className="text-lg font-semibold mb-4">Top Sellers</h2>
        <ul>
          {metrics.topSellers?.map((s: any, i: number) => (
            <li key={i} className="mb-2">
              {s.buyer_id}: ${s.revenue.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      {/* Recent Transactions */}
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
            {paginatedTransactions.map((tx: any, i: number) => (
              <tr key={i} className="border-b border-gray-700">
                <td className="p-2">{tx.buyer_id}</td>
                <td className="p-2">{tx.listing_id}</td>
                <td className="p-2">${tx.purchase_price?.toFixed(2)}</td>
                <td className="p-2">{new Date(tx.purchased_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
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

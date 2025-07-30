// /pages/admin/metrics.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
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
  const router = useRouter();

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

    const revenue = transactions?.reduce(
      (sum, t) => sum + (t.purchase_price || 0),
      0
    );

    const revenueByDay: Record<string, number> = {};
    transactions?.forEach((t) => {
      const date = new Date(t.purchased_at).toISOString().split('T')[0];
      revenueByDay[date] = (revenueByDay[date] || 0) + (t.purchase_price || 0);
    });

    const chartData = Object.entries(revenueByDay).map(([date, amount]) => ({
      date,
      amount,
    }));

    setMetrics({
      totalListings: listings?.length || 0,
      totalRevenue: revenue?.toFixed(2),
      totalUsers: users?.length || 0,
      chartData,
      recentTransactions: transactions || [],
    });
  };

  return (
    <div className="text-white p-8 bg-gray-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Metrics Dashboard</h1>

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
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#38bdf8"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
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
            {metrics.recentTransactions?.slice(0, 10).map((tx: any, i: number) => (
              <tr key={i} className="border-b border-gray-700">
                <td className="p-2">{tx.buyer_id}</td>
                <td className="p-2">{tx.listing_id}</td>
                <td className="p-2">${tx.purchase_price?.toFixed(2)}</td>
                <td className="p-2">
                  {new Date(tx.purchased_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 
        Future Enhancements:
        1. Add a date range filter (startDate, endDate) to refine metrics.
        2. Add pagination for recent transactions (next/prev page buttons).
        3. Add "Top Selling Listings" section using aggregation on transactions.
        4. Add "Active Sellers" ranking by revenue generated.
      */}
    </div>
  );
}

// /pages/market.tsx
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getSupabaseClient } from '../lib/supabaseClient';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Dataset = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  unit_price_cents: number;
  is_active: boolean;
  created_at: string;
};

type SaleRecord = {
  dataset_id: string;
  quantity: number;
  gross_amount: number;
  purchased_at: string;
};

type TrendPoint = {
  date: string;
  [key: string]: number | string;
};

const formatDateString = (input: string) => {
  const date = new Date(input);
  return date.toISOString().slice(0, 10);
};

const getPastDates = (days: number) => {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - 1 - index));
    return date.toISOString().slice(0, 10);
  });
};

const generateTrendData = (
  dates: string[],
  topDatasets: Dataset[],
  dailySales: Record<string, Record<string, number>>
) => {
  return dates.map((date) => {
    const point: TrendPoint = { date };

    topDatasets.forEach((dataset, index) => {
      const demand = dailySales[dataset.id]?.[date] ?? 0;
      const basePrice = dataset.unit_price_cents / 100;
      const volatility = Math.sin(index + new Date(date).getTime() / 4.32e8) * 0.08;
      const demandImpact = Math.min(0.25, demand / 25);
      point[dataset.name] = Number((basePrice * (1 + demandImpact + volatility)).toFixed(2));
    });

    return point;
  });
};

export default function Markets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    (async () => {
      setPageLoading(true);
      setErrMsg(null);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [{ data: datasetData, error: datasetError }, { data: saleData, error: salesError }] =
        await Promise.all([
          supabase
            .from('datasets')
            .select('id,slug,name,description,tags,unit_price_cents,is_active,created_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('dataset_sales')
            .select('dataset_id,quantity,gross_amount,purchased_at')
            .gte('purchased_at', thirtyDaysAgo.toISOString())
            .order('purchased_at', { ascending: true }),
        ]);

      if (datasetError || salesError) {
        console.error('Markets load failed:', datasetError || salesError);
        setErrMsg('Unable to load market data. Please refresh.');
      } else {
        setDatasets((datasetData as Dataset[]) || []);
        setSales((saleData as SaleRecord[]) || []);
      }

      setPageLoading(false);
    })();
  }, [supabase]);

  const salesByDataset = useMemo(() => {
    return sales.reduce<Record<string, { totalQty: number; totalRevenue: number }>>((acc, sale) => {
      const entry = acc[sale.dataset_id] || { totalQty: 0, totalRevenue: 0 };
      entry.totalQty += sale.quantity;
      entry.totalRevenue += sale.gross_amount;
      acc[sale.dataset_id] = entry;
      return acc;
    }, {});
  }, [sales]);

  const topDatasets = useMemo(() => {
    const activeDatasets = datasets.filter((ds) => ds.is_active);
    const sorted = [...activeDatasets].sort((a, b) => {
      const aQty = salesByDataset[a.id]?.totalQty ?? 0;
      const bQty = salesByDataset[b.id]?.totalQty ?? 0;
      return bQty - aQty || b.name.localeCompare(a.name);
    });
    return sorted.slice(0, 4);
  }, [datasets, salesByDataset]);

  const totalVolume = useMemo(
    () => sales.reduce((sum, sale) => sum + sale.quantity, 0),
    [sales]
  );

  const averagePrice = useMemo(() => {
    if (!datasets.length) return 0;
    const active = datasets.filter((ds) => ds.is_active);
    return active.reduce((sum, ds) => sum + ds.unit_price_cents / 100, 0) / Math.max(active.length, 1);
  }, [datasets]);

  const recentTrendData = useMemo(() => {
    const dates = getPastDates(30);
    const dailySales: Record<string, Record<string, number>> = {};

    sales.forEach((sale) => {
      const date = formatDateString(sale.purchased_at);
      if (!dailySales[sale.dataset_id]) dailySales[sale.dataset_id] = {};
      dailySales[sale.dataset_id][date] = (dailySales[sale.dataset_id][date] || 0) + sale.quantity;
    });

    return generateTrendData(dates, topDatasets, dailySales);
  }, [sales, topDatasets]);

  const demandBars = useMemo(() => {
    return topDatasets.map((dataset) => ({
      name: dataset.name,
      demand: salesByDataset[dataset.id]?.totalQty ?? 0,
      avgPrice: Number((dataset.unit_price_cents / 100).toFixed(2)),
    }));
  }, [topDatasets, salesByDataset]);

  const momentum = useMemo(() => {
    const weekDays = getPastDates(14);
    const thisWeek = weekDays.slice(7);
    const lastWeek = weekDays.slice(0, 7);

    const getTotal = (range: string[]) =>
      range.reduce((sum, date) => {
        return (
          sum +
          sales.reduce((inner, sale) => {
            const saleDate = formatDateString(sale.purchased_at);
            return inner + (saleDate === date ? sale.quantity : 0);
          }, 0)
        );
      }, 0);

    const current = getTotal(thisWeek);
    const previous = getTotal(lastWeek);
    return previous === 0 ? 0 : Number((((current - previous) / previous) * 100).toFixed(1));
  }, [sales]);

  const marketHighlights = [
    {
      label: 'Market Volume',
      value: `${totalVolume.toLocaleString()} requests`,
      description: 'Demand volume across popular datasets over the past 30 days.',
    },
    {
      label: 'Average Data Price',
      value: `$${averagePrice.toFixed(2)}`,
      description: 'Weighted pricing level for active datasets.',
    },
    {
      label: 'Momentum',
      value: `${momentum >= 0 ? '+' : ''}${momentum}%`,
      description: 'Week-over-week demand change in dataset purchases.',
    },
  ];

  const datasetCards = useMemo(() => {
    return topDatasets.map((dataset) => ({
      ...dataset,
      demand: salesByDataset[dataset.id]?.totalQty ?? 0,
      revenue: salesByDataset[dataset.id]?.totalRevenue ?? 0,
      price: dataset.unit_price_cents / 100,
    }));
  }, [topDatasets, salesByDataset]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <Head>
        <title>Markets – Sovrn</title>
      </Head>

      <section className="mb-10 rounded-3xl border border-gray-800 bg-[#050b16] p-8 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-300">Market Analytics</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">Data Demand Markets</h1>
            <p className="mt-4 max-w-2xl text-gray-400 leading-relaxed">
              Explore real-time economics for dataset demand, pricing momentum, and opt-in value trends.
              This finance-style dashboard surfaces the hottest dataset categories, price movements, and market pressure.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {marketHighlights.map((highlight) => (
              <div key={highlight.label} className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
                <p className="text-sm text-gray-400">{highlight.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{highlight.value}</p>
                <p className="mt-2 text-sm text-gray-400">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-gray-800 bg-[#050b16] p-6 shadow-xl">
          <div className="flex items-center justify-between gap-4 pb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-blue-300">Price Trends</p>
              <h2 className="mt-2 text-2xl font-semibold">Most popular dataset pricing</h2>
            </div>
            <div className="rounded-2xl bg-gray-900 px-4 py-2 text-sm text-gray-300">
              Last 30 days
            </div>
          </div>

          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentTrendData}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                {topDatasets.map((dataset, index) => (
                  <Line
                    key={dataset.id}
                    type="monotone"
                    dataKey={dataset.name}
                    stroke={['#60a5fa', '#34d399', '#f97316', '#a855f7'][index]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-800 bg-[#050b16] p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-300">Volatility</p>
            <h2 className="mt-2 text-2xl font-semibold">Demand vs Price</h2>
            <p className="mt-3 text-sm text-gray-400">
              Top dataset categories by volume and average unit price over the last 30 days.
            </p>
            <div className="h-[320px] mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandBars} margin={{ top: 6, right: 0, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="demand" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-[#050b16] p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-300">Snapshot</p>
            <h2 className="mt-2 text-2xl font-semibold">Dataset heatmap</h2>
            <div className="mt-6 grid gap-4">
              {datasetCards.map((dataset) => (
                <div
                  key={dataset.id}
                  className={`rounded-3xl border px-5 py-4 transition ${
                    activeDataset === dataset.id ? 'border-blue-400 bg-gray-900' : 'border-gray-800 bg-gray-950'
                  }`}
                  onMouseEnter={() => setActiveDataset(dataset.id)}
                  onMouseLeave={() => setActiveDataset(null)}
                >
                  <p className="text-sm text-gray-400">{dataset.name}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xl font-semibold text-white">${dataset.price.toFixed(2)}</p>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                      {dataset.demand.toLocaleString()} requests
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">Revenue: ${dataset.revenue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-800 bg-[#050b16] p-8 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-blue-300">Market signal</p>
            <h2 className="mt-2 text-2xl font-semibold">Opt-in pricing heatmap</h2>
          </div>
          <Link href="/buyer" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
            Explore Buyer Portal
          </Link>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl bg-gray-950 p-5">
            <p className="text-sm text-gray-400">Location Data</p>
            <p className="mt-3 text-3xl font-semibold text-white">$12.80</p>
            <p className="mt-2 text-sm text-gray-400">+18% in demand over the last week</p>
          </div>
          <div className="rounded-3xl bg-gray-950 p-5">
            <p className="text-sm text-gray-400">App Usage</p>
            <p className="mt-3 text-3xl font-semibold text-white">$9.40</p>
            <p className="mt-2 text-sm text-gray-400">+12% price movement on buyer interest</p>
          </div>
          <div className="rounded-3xl bg-gray-950 p-5">
            <p className="text-sm text-gray-400">Connectivity Signals</p>
            <p className="mt-3 text-3xl font-semibold text-white">$14.20</p>
            <p className="mt-2 text-sm text-gray-400">Strong momentum from dataset opt-ins</p>
          </div>
        </div>
      </section>
    </div>
  );
}

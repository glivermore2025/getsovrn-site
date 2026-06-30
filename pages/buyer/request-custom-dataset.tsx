import Head from 'next/head';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/authContext';

const supabase = getSupabaseClient();

export default function RequestCustomDatasetPage() {
  const { user, loading: authLoading } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [email, setEmail] = useState('');
  const [targetGeography, setTargetGeography] = useState('Houston Metro');
  const [dataCategory, setDataCategory] = useState('Device & Connectivity');
  const [useCase, setUseCase] = useState('Site selection or infrastructure planning');
  const [refreshCadence, setRefreshCadence] = useState('Daily');
  const [aggregationLevel, setAggregationLevel] = useState('ZIP-code level');
  const [timeline, setTimeline] = useState('Next 30 days');
  const [budgetRange, setBudgetRange] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus('submitting');

    if (!user) {
      setError('Please sign in before submitting a custom dataset request.');
      setStatus('error');
      return;
    }

    if (!companyName || !buyerName || !email || !useCase) {
      setError('Please fill in the required fields.');
      setStatus('error');
      return;
    }

    try {
      const { error: insertError } = await supabase.from('custom_dataset_requests').insert([
        {
          buyer_id: user.id,
          buyer_name: buyerName,
          company_name: companyName,
          email,
          target_geography: targetGeography,
          data_category: dataCategory,
          use_case: useCase,
          refresh_cadence: refreshCadence,
          aggregation_level: aggregationLevel,
          timeline,
          budget_range: budgetRange,
          notes,
          status: 'new',
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      setStatus('success');
    } catch (err: any) {
      console.error('Request submission failed', err);
      setError('Unable to submit your request. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Head>
        <title>Request Custom Dataset – Sovrn</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-8">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <h1 className="text-4xl font-bold">Request a custom dataset</h1>
          <p className="mt-3 text-gray-400 text-lg">
            If you need a dataset that is not yet published in the marketplace, submit your requirements here and our team will follow up with pilot pricing and availability.
          </p>
        </section>

        {authLoading ? (
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Checking account...
          </div>
        ) : !user ? (
          <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900 p-12 text-center">
            <p className="text-lg font-semibold text-white">Sign in to request a custom dataset.</p>
            <p className="mx-auto mt-3 max-w-2xl text-gray-400">
              Custom access requests are attached to your buyer account so you can track review status from the Buyer Dashboard.
            </p>
            <Link href="/login" className="mt-6 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Sign In
            </Link>
          </div>
        ) : (

        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-300">
                <span>Buyer name</span>
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
                  required
                />
              </label>
              <label className="space-y-2 text-sm text-gray-300">
                <span>Company name</span>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-300">
                <span>Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
                  required
                />
              </label>
              <label className="space-y-2 text-sm text-gray-300">
                <span>Target geography</span>
                <input
                  value={targetGeography}
                  onChange={(e) => setTargetGeography(e.target.value)}
                  className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-300">
                <span>Data category</span>
                <select
                  value={dataCategory}
                  onChange={(e) => setDataCategory(e.target.value)}
                  className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
                >
                  <option>Device & Connectivity</option>
                  <option>Local Mobility</option>
                  <option>Consumer Pulse</option>
                  <option>Market Research</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-gray-300">
                <span>Refresh cadence</span>
                <select
                  value={refreshCadence}
                  onChange={(e) => setRefreshCadence(e.target.value)}
                  className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Custom</option>
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm text-gray-300">
              <span>Intended use case</span>
              <input
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
                required
              />
            </label>

            <label className="space-y-2 text-sm text-gray-300">
              <span>Desired aggregation level</span>
              <input
                value={aggregationLevel}
                onChange={(e) => setAggregationLevel(e.target.value)}
                className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
              />
            </label>

            <label className="space-y-2 text-sm text-gray-300">
              <span>Timeline</span>
              <input
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
              />
            </label>

            <label className="space-y-2 text-sm text-gray-300">
              <span>Budget range (optional)</span>
              <input
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
              />
            </label>

            <label className="space-y-2 text-sm text-gray-300">
              <span>Additional notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 text-white"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm text-gray-400">
                <p>Access requests are reviewed manually during the pilot.</p>
                <p>We will contact you with next steps and demo pricing.</p>
              </div>
              <button
                type="submit"
                disabled={status === 'submitting' || authLoading}
                className="rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {status === 'submitting' ? 'Submitting…' : 'Submit request'}
              </button>
            </div>

            {status === 'success' && (
              <div className="rounded-2xl bg-green-950 border border-green-700 p-4 text-sm text-green-300">
                <p>Your request has been submitted. We will follow up with next steps soon.</p>
                <Link href="/buyer/dashboard" className="mt-3 inline-flex text-green-200 underline">
                  Track this request in Buyer Dashboard
                </Link>
              </div>
            )}
            {status === 'error' && error && (
              <p className="rounded-2xl bg-red-950 border border-red-700 p-4 text-sm text-red-300">{error}</p>
            )}
          </form>
        </section>
        )}
      </div>
    </div>
  );
}

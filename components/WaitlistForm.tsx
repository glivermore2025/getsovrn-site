// components/WaitlistForm.tsx
'use client';

import { useState } from 'react';

const audienceOptions = [
  { value: 'sell', label: 'I want to contribute data' },
  { value: 'buy', label: 'I want to buy data' },
  { value: 'partner', label: 'I’m interested in partnering' },
];

export default function WaitlistForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [audience, setAudience] = useState('sell');
  const [dataInterest, setDataInterest] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim()) {
      setError('Please provide your name and email.');
      return;
    }

    if (audience === 'buy' && !company.trim()) {
      setError('Buyers should tell us their company so we can follow up with the right pilot plan.');
      return;
    }

    setLoading(true);

    try {
      await fetch('https://script.google.com/macros/s/AKfycbyR1GOdjL3npozWeSYyJBrFpX3GMn59tR9RTaZUJtdW-z1pu6aFcPUnTHQQcwYOiz04/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, audience, dataInterest }),
      });

      await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      setSubmitted(true);
    } catch (_err) {
      setError('Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="bg-white/10 p-8 rounded-3xl shadow-lg text-center text-white border border-gray-800">
        <h2 className="text-2xl font-semibold mb-3">You're on the waitlist 🎉</h2>
        <p className="text-sm text-gray-300 max-w-xl mx-auto">
          Thanks for joining. We’ll keep you updated as Sovrn grows and share the first access details soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 p-8 rounded-3xl border border-gray-800 shadow-lg space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Join the Sovrn waitlist</h2>
        <p className="mt-2 text-sm text-gray-400">
          Choose your path and we’ll keep you updated as the marketplace grows.
        </p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-gray-300">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            placeholder="Full name"
            required
          />
        </label>
        <label className="space-y-2 text-sm text-gray-300">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            placeholder="you@example.com"
            required
          />
        </label>
      </div>

      <label className="space-y-2 text-sm text-gray-300">
        <span>Audience</span>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
        >
          {audienceOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm text-gray-300">
        <span>Company {audience === 'buy' ? '(recommended)' : '(optional)'}</span>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
          placeholder={audience === 'buy' ? 'Company name for buyer follow-up' : 'Optional company or project name'}
          required={audience === 'buy'}
        />
      </label>

      <label className="space-y-2 text-sm text-gray-300">
        <span>What data are you interested in? <span className="text-gray-500">(optional)</span></span>
        <input
          type="text"
          value={dataInterest}
          onChange={(e) => setDataInterest(e.target.value)}
          className="w-full rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
          placeholder="e.g. mobility signals, network coverage, consumer trends"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
      >
        {loading ? 'Joining the waitlist…' : 'Join the Waitlist'}
      </button>
    </form>
  );
}

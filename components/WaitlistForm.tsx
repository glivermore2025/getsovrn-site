// components/WaitlistForm.tsx
'use client';

import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('sell');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    await fetch('https://script.google.com/macros/s/AKfycbyR1GOdjL3npozWeSYyJBrFpX3GMn59tR9RTaZUJtdW-z1pu6aFcPUnTHQQcwYOiz04/exec', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });

    await fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    setSubmitted(true);
  } catch (err) {
    alert('Something went wrong. Try again.');
  }

  setLoading(false);
};

  if (submitted) {
    return (
      <div className="bg-white/10 p-6 rounded-xl shadow text-center text-white">
        <h2 className="text-xl font-semibold mb-2">You're on the waitlist 🎉</h2>
        <p className="text-sm text-gray-200">We'll notify you as soon as Sovrn launches.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/10 p-6 rounded-xl shadow space-y-4">
      <h2 className="text-xl font-semibold text-white">Join the Waitlist</h2>

      <input
        type="email"
        placeholder="Your email"
        className="w-full p-2 rounded bg-white text-black"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full p-2 rounded bg-white text-black"
      >
        <option value="sell">I want to sell my data</option>
        <option value="buy">I want to buy data</option>
      </select>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
      >
        {loading ? 'Joining...' : 'Join Waitlist'}
      </button>
    </form>
  );
}

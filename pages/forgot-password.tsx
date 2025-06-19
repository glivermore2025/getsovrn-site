// pages/forgot-password.tsx

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Head from 'next/head';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://getsovrn.com/reset'
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col items-center">
      <Head>
        <title>Reset Password – Sovrn</title>
      </Head>

      <h1 className="text-2xl font-bold mb-4">Forgot your password?</h1>
      <p className="text-gray-400 mb-6">Enter your email to receive a reset link.</p>

      <form onSubmit={handleReset} className="w-full max-w-md space-y-4 bg-gray-900 p-6 rounded">
        <input
          type="email"
          placeholder="Your email"
          className="w-full p-2 rounded bg-gray-800"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit" className="w-full bg-blue-600 py-2 px-4 rounded">
          Send Reset Link
        </button>

        {sent && <p className="text-green-400">Reset link sent! Check your email.</p>}
        {error && <p className="text-red-400">{error}</p>}
      </form>
    </div>
  );
}

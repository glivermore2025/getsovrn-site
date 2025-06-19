// pages/reset.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Head from 'next/head';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Supabase handles the session automatically on redirect
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setError('Invalid or expired reset link.');
      }
    });
  }, []);

  const handleReset = async (e: any) => {
    e.preventDefault();

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setError(error.message);
    } else {
      setConfirmed(true);
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col items-center">
      <Head>
        <title>Reset Password – Sovrn</title>
      </Head>

      <h1 className="text-2xl font-bold mb-4">Reset Your Password</h1>
      <p className="text-gray-400 mb-6">Enter your new password below.</p>

      <form onSubmit={handleReset} className="w-full max-w-md space-y-4 bg-gray-900 p-6 rounded">
        <input
          type="password"
          placeholder="New password"
          className="w-full p-2 rounded bg-gray-800"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <button type="submit" className="w-full bg-blue-600 py-2 px-4 rounded">
          Reset Password
        </button>

        {confirmed && (
          <p className="text-green-400">
            Password reset! Redirecting to login...
          </p>
        )}
        {error && <p className="text-red-400">{error}</p>}
      </form>
    </div>
  );
}

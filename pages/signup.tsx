import { useState } from 'react';
import Head from 'next/head';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const supabase = getSupabaseClient();
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 max-w-sm mx-auto">
      <Head><title>Sign Up – Sovrn</title></Head>

      <h1 className="text-3xl font-bold mb-6">Create Account</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 mb-4 bg-gray-800 rounded"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 mb-4 bg-gray-800 rounded"
      />

      <button onClick={handleSignup} className="bg-blue-600 py-2 w-full rounded mb-4">Sign Up</button>

      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
}

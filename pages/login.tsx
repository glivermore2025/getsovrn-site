// pages/login.tsx
import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/authContext';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const handleLogin = async () => {
    setError('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard'); // Or use router.query.redirectTo || '/dashboard'
    }
  };

  // If user is already logged in, redirect
  if (user) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 max-w-sm mx-auto">
      <Head><title>Login – Sovrn</title></Head>

      <h1 className="text-3xl font-bold mb-6">Login</h1>

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

      <button onClick={handleLogin} className="bg-green-600 py-2 w-full rounded mb-2">Log In</button>

      <div className="text-sm text-blue-400 hover:underline text-center mb-4">
        <Link href="/forgot-password">Forgot your password?</Link>
      </div>

      {error && <p className="text-red-400 text-center">{error}</p>}
    </div>
  );
}

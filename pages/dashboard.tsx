// This will be your initial scaffold for Sovrn Marketplace MVP
// We are using Next.js with Supabase auth & database integration

import Head from 'next/head';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase client (you will set these environment variables in Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setUser(data.user);
  };

  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else setUser(data.user);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <Head>
        <title>Sovrn Marketplace MVP</title>
      </Head>

      <header className="mb-12">
        <h1 className="text-4xl font-bold">Sovrn Marketplace</h1>
        <p className="text-gray-400 mt-2">Own, price, and list your data for buyers.</p>
      </header>

      {!user ? (
        <div className="max-w-sm mx-auto bg-gray-900 p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Sign Up / Sign In</h2>
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 mb-3 bg-gray-800 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 mb-3 bg-gray-800 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex space-x-3">
            <button onClick={handleSignUp} className="flex-1 bg-blue-600 py-2 rounded">Sign Up</button>
            <button onClick={handleSignIn} className="flex-1 bg-green-600 py-2 rounded">Sign In</button>
          </div>
          {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl mb-4">Welcome, {user.email}!</h2>
          <p className="text-gray-400">You're now ready to list your data for sale.</p>
        </div>
      )}
    </div>
  );
}

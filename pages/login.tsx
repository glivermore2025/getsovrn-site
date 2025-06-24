import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const redirectTo = router.query.redirectTo as string | undefined;
  console.log("Redirect query param:", redirectTo);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("Login response:", { data, error });

    if (error) {
      setError(error.message);
    } else if (!data.session) {
      setError('Login failed: no session returned.');
    } else {
      const path = redirectTo || '/dashboard';
      router.push(path);
    }
  };

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

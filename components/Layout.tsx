// /components/Layout.tsx

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <header className="flex justify-between items-center p-6 border-b border-gray-800">
        <Link href="/" className="text-2xl font-bold">SOVRN</Link>

        <nav className="flex items-center space-x-6 text-sm">
          <Link href="/marketplace" className="hover:text-blue-400">Marketplace</Link>
          <Link href="/dashboard" className="hover:text-blue-400">Dashboard</Link>

          {user ? (
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 py-1 px-4 rounded">Logout</button>
          ) : (
            <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-700 py-1 px-4 rounded">Login</Link>
          )}
        </nav>
      </header>

      <main className="p-8 max-w-5xl mx-auto">{children}</main>

      <footer className="text-center text-gray-500 text-sm py-10 border-t border-gray-800">
        &copy; {new Date().getFullYear()} Sovrn. All rights reserved.
      </footer>
    </div>
  );
}

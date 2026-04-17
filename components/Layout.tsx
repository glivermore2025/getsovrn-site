import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/authContext';
import { ADMIN_USER_IDS } from '../lib/constants';

const supabase = getSupabaseClient();

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [buyerMenuOpen, setBuyerMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <header className="relative flex justify-between items-center p-6 border-b border-gray-800">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.png" alt="Sovrn logo" className="h-20 w-35 object-contain" />
        </Link>

        <div className="flex items-center space-x-8">
          <nav className="flex items-center space-x-8 text-base font-medium">
            <Link href="/market" className="hover:text-blue-400">Markets</Link>
            <Link href="/dashboard" className="hover:text-blue-400">Seller</Link>

            <div
              className="relative"
              onMouseEnter={() => setBuyerMenuOpen(true)}
              onMouseLeave={() => setBuyerMenuOpen(false)}
            >
              <Link href="/buyer" className="hover:text-blue-400">Buyer</Link>
              <div
                className={`absolute right-0 mt-2 w-56 rounded-2xl border border-gray-800 bg-gray-950 shadow-xl transition-opacity duration-200 ${
                  buyerMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
              >
                <Link href="/buyer/data-purchasing" className="block px-4 py-3 text-sm text-white hover:bg-gray-900">
                  Data Purchasing
                </Link>
                <Link href="/buyer/purchased-data" className="block px-4 py-3 text-sm text-white hover:bg-gray-900">
                  Purchased Data
                </Link>
              </div>
            </div>

            <Link href="/profile" className="hover:text-blue-400">Account</Link>
          </nav>

          <div className="flex items-center space-x-4">
            {ADMIN_USER_IDS.includes(user?.id || '') && (
              <Link href="/admin/metrics" className="bg-yellow-600 hover:bg-yellow-700 py-1 px-4 rounded">
                Admin
              </Link>
            )}
            {user ? (
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 py-2 px-5 rounded text-base font-medium">
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto">{children}</main>

      <footer className="text-center text-gray-500 text-sm py-10 border-t border-gray-800">
        &copy; {new Date().getFullYear()} Sovrn. All rights reserved.
      </footer>
    </div>
  );
}


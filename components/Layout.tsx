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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAccountClick = () => {
    if (user) {
      router.push('/profile');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <header className="relative flex justify-between items-center p-4 md:p-6 border-b border-gray-800">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.png" alt="Sovrn logo" className="h-16 w-28 md:h-20 md:w-35 object-contain" />
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <nav className="flex items-center space-x-8 text-base font-medium">
            <Link href="/market" className="hover:text-blue-400">Market Signals</Link>
            <Link href="/for-consumers" className="hover:text-blue-400">For Consumers</Link>
            <Link href="/for-buyers" className="hover:text-blue-400">For Buyers</Link>

            <div
              className="relative"
              onMouseEnter={() => setBuyerMenuOpen(true)}
              onMouseLeave={() => setBuyerMenuOpen(false)}
            >
              <Link href="/buyer" className="hover:text-blue-400">Buyer</Link>
              <div
                className={`absolute right-0 mt-2 w-64 rounded-2xl border border-gray-800 bg-gray-950 shadow-xl transition-opacity duration-200 ${
                  buyerMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
              >
                <Link href="/buyer/dashboard" className="block px-4 py-3 text-sm text-white hover:bg-gray-900">
                  Buyer Dashboard
                </Link>
                <Link href="/buyer/marketplace" className="block px-4 py-3 text-sm text-white hover:bg-gray-900">
                  Marketplace
                </Link>
                <Link href="/buyer/request-custom-dataset" className="block px-4 py-3 text-sm text-white hover:bg-gray-900">
                  Request Custom Dataset
                </Link>
              </div>
            </div>

            <button onClick={handleAccountClick} className="hover:text-blue-400 bg-transparent border-none cursor-pointer">
              Account
            </button>
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

      {/* Mobile navigation menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-950 border-b border-gray-800">
          <nav className="px-4 py-4 space-y-4">
            <Link href="/market" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
              Market Signals
            </Link>
            <Link href="/for-consumers" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
              For Consumers
            </Link>
            <Link href="/for-buyers" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
              For Buyers
            </Link>
            <Link href="/buyer" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
              Buyer
            </Link>
            <button onClick={() => { handleAccountClick(); setMobileMenuOpen(false); }} className="block text-base font-medium hover:text-blue-400 bg-transparent border-none cursor-pointer text-left">
              Account
            </button>

            <div className="pt-4 border-t border-gray-800 flex flex-col space-y-2">
              {ADMIN_USER_IDS.includes(user?.id || '') && (
                <Link href="/admin/metrics" className="bg-yellow-600 hover:bg-yellow-700 py-2 px-4 rounded text-sm text-center" onClick={() => setMobileMenuOpen(false)}>
                  Admin
                </Link>
              )}
              {user ? (
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="bg-red-600 hover:bg-red-700 py-2 px-4 rounded text-base font-medium">
                  Logout
                </button>
              ) : null}
            </div>
          </nav>
        </div>
      )}

      <main className="p-4 md:p-8 max-w-5xl mx-auto">{children}</main>

      <footer className="text-center text-gray-500 text-sm py-10 border-t border-gray-800">
        &copy; {new Date().getFullYear()} Sovrn. All rights reserved.
      </footer>
    </div>
  );
}


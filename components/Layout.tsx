import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/authContext';
import { getCurrentUserIsAdmin } from '../lib/roleAccess';

const supabase = getSupabaseClient();

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [buyerMenuOpen, setBuyerMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    if (!user) {
      setIsAdmin(false);
      return;
    }

    getCurrentUserIsAdmin().then((admin) => {
      if (active) setIsAdmin(admin);
    });

    return () => {
      active = false;
    };
  }, [user]);

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
        <div className="hidden md:flex flex-1 items-center justify-end space-x-6">
          <nav className="flex items-center space-x-8 text-base font-medium">
            <Link href="/#how-it-works" className="hover:text-blue-400">How It Works</Link>
            <Link href="/for-consumers" className="hover:text-blue-400">For Sellers</Link>
            <Link href="/for-buyers" className="hover:text-blue-400">For Buyers</Link>
            <Link href="/market" className="hover:text-blue-400">Market Insights</Link>
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/dashboard" className="rounded-full border border-gray-700 bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:border-blue-400 hover:text-blue-400 transition">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-white hover:text-blue-400 transition">
                  Sign In
                </Link>
                <Link href="/" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                  Join Waitlist
                </Link>
              </>
            )}
            {isAdmin && (
              <Link href="/admin/metrics" className="rounded-full bg-yellow-600 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-700 transition">
                Admin
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile navigation menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-950 border-b border-gray-800">
          <nav className="px-4 py-4 space-y-4">
            <Link href="/#how-it-works" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
              How It Works
            </Link>
            <Link href="/for-consumers" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
              For Sellers
            </Link>
            <Link href="/for-buyers" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
              For Buyers
            </Link>
            <Link href="/market" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
              Market Insights
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-left text-base font-medium hover:text-blue-400 bg-transparent border-none cursor-pointer">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/" className="block text-base font-medium hover:text-blue-400" onClick={() => setMobileMenuOpen(false)}>
                  Join Waitlist
                </Link>
              </>
            )}
            <div className="pt-4 border-t border-gray-800 flex flex-col space-y-2">
              {isAdmin && (
                <Link href="/admin/metrics" className="bg-yellow-600 hover:bg-yellow-700 py-2 px-4 rounded text-sm text-center" onClick={() => setMobileMenuOpen(false)}>
                  Admin
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}

      <main className="p-4 md:p-8 max-w-screen-2xl mx-auto">{children}</main>

      <footer className="text-center text-gray-500 text-sm py-10 border-t border-gray-800">
        &copy; {new Date().getFullYear()} Sovrn. All rights reserved.
      </footer>
    </div>
  );
}


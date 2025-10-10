import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/authContext';
import { ADMIN_USER_IDS } from '../lib/constants';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <header className="flex justify-between items-center p-6 border-b border-gray-800">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.png" alt="Sovrn logo" className="h-20 w-35 object-contain" />
        </Link>

        <nav className="flex items-center space-x-6 text-sm">
          <Link href="/marketplace" className="hover:text-blue-400">Marketplace</Link>
          <Link href="/market" className="hover:text-blue-400">Markets</Link>
          <Link href="/dashboard" className="hover:text-blue-400">Dashboard</Link>

          {user ? (
            <div className="flex items-center space-x-4">
              {ADMIN_USER_IDS.includes(user.id) && (
                <Link href="/admin/metrics" className="bg-yellow-600 hover:bg-yellow-700 py-1 px-4 rounded">
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 py-1 px-4 rounded">
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 py-1 px-4 rounded">Login</Link>
              <Link href="/signup" className="bg-green-600 hover:bg-green-700 py-1 px-4 rounded">Sign Up</Link>
            </>
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


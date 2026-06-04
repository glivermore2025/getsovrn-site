import { getSupabaseClient } from './supabaseClient';

export type UserRole = 'admin' | 'buyer' | 'seller' | 'consumer';

export async function getCurrentUserRole() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { role: null, isAdmin: false };
  }

  const response = await fetch('/api/auth/role', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    return { role: null, isAdmin: false };
  }

  return (await response.json()) as { role: UserRole | null; isAdmin: boolean };
}

export async function getCurrentUserIsAdmin() {
  const { isAdmin } = await getCurrentUserRole();
  return isAdmin;
}

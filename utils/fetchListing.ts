// utils/fetchListings.ts
import { supabase } from '../lib/supabaseClient';

export const getUserListings = async (userId) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching listings:', error);
    return [];
  }

  return data || [];
};

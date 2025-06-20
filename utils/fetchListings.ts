// utils/fetchListings.ts
import { supabase } from '../lib/supabaseClient';

export const getUserListings = async (userId: string) => {
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

export const fetchListingById = async (id: string) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching listing by ID:', error);
    return null;
  }

  return data;
};

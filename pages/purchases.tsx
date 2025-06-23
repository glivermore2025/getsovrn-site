const { data: purchases } = await supabase
  .from('purchases')
  .select('listing_id, listings (title, file_path)')
  .eq('user_id', user.id);

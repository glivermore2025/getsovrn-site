-- MVP security hardening draft.
-- Review in a Supabase SQL editor before applying to production.

-- 1. Enable RLS on public tables currently flagged by Supabase advisors.
alter table if exists public.profiles enable row level security;
alter table if exists public.dataset_prices enable row level security;
alter table if exists public.dataset_access enable row level security;

-- 2. Profile ownership policies.
drop policy if exists "profiles: users can read self" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- 3. Dataset pricing is read-only to public clients for active public datasets.
drop policy if exists "dataset_prices_public_read_active" on public.dataset_prices;

create policy "dataset_prices_public_read_active"
on public.dataset_prices for select to anon, authenticated
using (
  exists (
    select 1
    from public.datasets d
    where d.id = dataset_id
      and coalesce(d.is_active, true) = true
  )
);

-- 4. Dataset access is visible only to the buyer who owns it.
drop policy if exists "dataset_access_buyer_read_own" on public.dataset_access;

create policy "dataset_access_buyer_read_own"
on public.dataset_access for select to authenticated
using ((select auth.uid()) = buyer_id);

-- 5. Lock down SECURITY DEFINER RPCs from direct anon access.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.get_user_event_counts(uuid) from anon;

-- Keep get_user_event_counts callable by signed-in users, but constrain it to
-- the caller and fix search_path.
create or replace function public.get_user_event_counts(p_user_id uuid)
returns table (module_key text, event_count bigint, last_event timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.module_key, count(*)::bigint, max(e.captured_at)
  from public.device_events e
  where e.user_id = p_user_id
    and p_user_id = (select auth.uid())
  group by e.module_key;
$$;

grant execute on function public.get_user_event_counts(uuid) to authenticated;

-- 6. Reduce public API visibility for highly sensitive user-owned tables.
-- Apply after confirming no client path depends on anon reads.
revoke select on
  public.buyer_post_optins,
  public.buyer_saved_filters,
  public.consent_preferences,
  public.dataset_access,
  public.dataset_contributions,
  public.dataset_payouts,
  public.dataset_purchases,
  public.dataset_sales,
  public.device_events,
  public.device_snapshots,
  public.revenue_shares,
  public.transactions,
  public.user_balances,
  public.user_demographics,
  public.user_devices,
  public.user_module_permissions,
  public.user_roles
from anon;

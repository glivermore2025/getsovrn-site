-- Custom dataset access request workflow.
-- Apply in Supabase SQL editor after reviewing policies for production.

create table if not exists public.custom_dataset_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references auth.users(id) on delete set null,
  buyer_name text not null,
  company_name text not null,
  email text not null,
  target_geography text not null,
  data_category text not null,
  use_case text not null,
  refresh_cadence text not null,
  aggregation_level text not null,
  timeline text not null,
  budget_range text,
  notes text,
  status text not null default 'new'
    check (status in ('new', 'in_review', 'approved', 'rejected')),
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_dataset_requests
  add column if not exists admin_notes text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.custom_dataset_requests enable row level security;

drop policy if exists "custom_dataset_requests_insert_own" on public.custom_dataset_requests;
drop policy if exists "custom_dataset_requests_select_own_or_admin" on public.custom_dataset_requests;
drop policy if exists "custom_dataset_requests_update_admin" on public.custom_dataset_requests;

create policy "custom_dataset_requests_insert_own"
on public.custom_dataset_requests for insert to authenticated
with check ((select auth.uid()) = buyer_id);

create policy "custom_dataset_requests_select_own_or_admin"
on public.custom_dataset_requests for select to authenticated
using (
  (select auth.uid()) = buyer_id
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'admin'
  )
);

create policy "custom_dataset_requests_update_admin"
on public.custom_dataset_requests for update to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'admin'
  )
);

create index if not exists custom_dataset_requests_buyer_created_idx
on public.custom_dataset_requests (buyer_id, created_at desc);

create index if not exists custom_dataset_requests_status_created_idx
on public.custom_dataset_requests (status, created_at desc);

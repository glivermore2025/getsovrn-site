-- MVP readiness schema additions for GetSovrn.
-- Apply after reviewing RLS policies for the live environment.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'buyer', 'seller', 'consumer')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

insert into public.user_roles (user_id, role)
values ('98af897d-c424-475f-9b74-3414b88900cf', 'admin')
on conflict (user_id) do update set role = excluded.role;

alter table public.dataset_purchases
  add column if not exists quantity integer not null default 1 check (quantity > 0),
  add column if not exists filter_json jsonb not null default '{}'::jsonb,
  add column if not exists amount_paid integer not null default 0 check (amount_paid >= 0),
  add column if not exists status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'refunded')),
  add column if not exists export_path text;

create unique index if not exists dataset_purchases_stripe_session_id_unique
on public.dataset_purchases (stripe_session_id)
where stripe_session_id is not null;

comment on column public.dataset_purchases.filter_json is
  'Buyer-selected filters captured at checkout so exports can be reproduced.';

comment on column public.dataset_purchases.export_path is
  'Storage path for the generated export after fulfillment.';

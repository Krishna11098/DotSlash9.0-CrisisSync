-- Reset + recreate schema for new citizen/gov workflow
-- Run this in Supabase SQL editor.

begin;

-- Drop dependent table first
DROP TABLE IF EXISTS public.requests;
DROP TABLE IF EXISTS public.users2;

-- New user profile table (app-level users)
create table public.users2 (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('citizen', 'gov_employee')),
  gov_sub_role text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Gov employees must provide location; citizens can keep it null
  constraint users2_gov_location_required check (
    role <> 'gov_employee' or (latitude is not null and longitude is not null)
  ),
  constraint users2_gov_sub_role_required check (
    role <> 'gov_employee' or (gov_sub_role is not null and length(trim(gov_sub_role)) > 0)
  )
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users2(id) on delete cascade,
  topic text not null,
  image_url text,
  audio_url text,
  latitude double precision not null,
  longitude double precision not null,
  departments text[] not null default '{}',
  urgency text not null check (urgency in ('emergency', 'urgent', 'moderate')),
  time_limit_minutes integer,
  status text not null default 'pending' check (status in ('pending', 'synced', 'discarded', 'resolved')),
  client_created_at timestamptz not null,
  server_created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_time_limit_required_for_high_priority check (
    (urgency in ('urgent', 'emergency') and time_limit_minutes is not null and time_limit_minutes > 0)
    or urgency = 'moderate'
  ),
  constraint requests_valid_departments check (
    cardinality(departments) > 0
    and departments <@ array['hospital', 'fire', 'police', 'municipal corporation']
  )
);

create index requests_user_id_idx on public.requests(user_id);
create index requests_urgency_idx on public.requests(urgency);
create index requests_status_idx on public.requests(status);
create index requests_client_created_at_idx on public.requests(client_created_at);
create index requests_departments_idx on public.requests using gin(departments);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users2_set_updated_at on public.users2;
create trigger users2_set_updated_at
before update on public.users2
for each row execute function public.set_updated_at();

drop trigger if exists requests_set_updated_at on public.requests;
create trigger requests_set_updated_at
before update on public.requests
for each row execute function public.set_updated_at();

-- RLS
alter table public.users2 enable row level security;
alter table public.requests enable row level security;

create policy "users2_select_own_or_gov"
on public.users2
for select
using (
  auth.uid() = id
  or exists (
    select 1 from public.users2 u2
    where u2.id = auth.uid() and u2.role = 'gov_employee'
  )
);

create policy "users2_insert_own"
on public.users2
for insert
with check (auth.uid() = id);

create policy "users2_update_own"
on public.users2
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "requests_select_own_or_gov"
on public.requests
for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.users2 u2
    where u2.id = auth.uid() and u2.role = 'gov_employee'
  )
);

create policy "requests_insert_citizen_only"
on public.requests
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.users2 u2
    where u2.id = auth.uid() and u2.role = 'citizen'
  )
);

create policy "requests_update_own_or_gov"
on public.requests
for update
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.users2 u2
    where u2.id = auth.uid() and u2.role = 'gov_employee'
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.users2 u2
    where u2.id = auth.uid() and u2.role = 'gov_employee'
  )
);

-- Realtime support
alter publication supabase_realtime add table public.requests;

commit;

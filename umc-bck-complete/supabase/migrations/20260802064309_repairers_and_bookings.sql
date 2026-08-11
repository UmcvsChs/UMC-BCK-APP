create type public.repair_booking_status as enum ('requested', 'diagnosed', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled');

create table public.repairers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  device_types text[] not null default '{}', -- 'Phones', 'Laptops', 'Tablets'
  specialties text[] not null default '{}', -- 'Screen replacement', 'Battery', 'Water damage', etc.
  years_experience integer check (years_experience >= 0),
  verification_status public.verification_status not null default 'pending',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_repairers_updated_at
  before update on public.repairers
  for each row execute function public.set_updated_at();

-- repair_bookings — request → diagnosis+quote → buyer accepts → completion.
-- Payment only moves at completion, via the same wallet hold/finalize
-- pattern as everything else — never before the work is confirmed done.
create table public.repair_bookings (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.profiles(id),
  repairer_id uuid not null references public.repairers(id),
  device_description text not null,
  issue_description text not null,
  photo_urls text[] not null default '{}',
  status public.repair_booking_status not null default 'requested',
  diagnosis_notes text,
  quoted_price numeric(14,2) check (quoted_price is null or quoted_price > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_repair_bookings_updated_at
  before update on public.repair_bookings
  for each row execute function public.set_updated_at();

create index idx_repair_bookings_requester_id on public.repair_bookings(requester_id);
create index idx_repair_bookings_repairer_id on public.repair_bookings(repairer_id);

alter table public.repairers enable row level security;
alter table public.repair_bookings enable row level security;

create policy "View own repairer profile, or any available verified repairer, or admin views any"
  on public.repairers for select
  using (
    (select auth.uid()) = user_id
    or (is_available = true and verification_status = 'approved')
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Repairer manages own profile"
  on public.repairers for update
  using ((select auth.uid()) = user_id or public.get_user_role((select auth.uid())) = 'admin');

create policy "Repairer or admin inserts profile"
  on public.repairers for insert
  with check ((select auth.uid()) = user_id or public.get_user_role((select auth.uid())) = 'admin');

create policy "View own booking as requester, as the repairer, or admin views any"
  on public.repair_bookings for select
  using (
    (select auth.uid()) = requester_id
    or exists (select 1 from public.repairers r where r.id = repairer_id and r.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

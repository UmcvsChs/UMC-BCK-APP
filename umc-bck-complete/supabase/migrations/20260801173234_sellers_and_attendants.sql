-- ── sellers — one store per owning profile ──
create table public.sellers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  store_name text not null,
  tier public.seller_tier not null default 'individual',
  cac_number text,
  lga text not null,
  market text,
  stall_number text,
  is_open boolean not null default true,
  verification_status public.verification_status not null default 'pending',
  instalment_opt_in boolean not null default false, -- must be explicitly enabled; instalments are never available by default
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.sellers.is_open is 'Buyer-facing browse/search must filter on this at query time — a closed store must never appear in results, not just show a "closed" badge on an otherwise-visible listing.';

create trigger set_sellers_updated_at
  before update on public.sellers
  for each row execute function public.set_updated_at();

-- ── attendants — explicitly NOT sellers. An attendant can operate a store's
-- day-to-day (view orders, mark items sold) but must never see cost price,
-- margins, or be able to edit pricing. That restriction is enforced here at
-- the database level via RLS + a dedicated read-safe view, not left to the
-- client UI to hide fields (which a modified client could bypass). ──
create table public.attendants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.sellers(id) on delete cascade,
  access_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, store_id)
);

create trigger set_attendants_updated_at
  before update on public.attendants
  for each row execute function public.set_updated_at();

-- Helper: is this user an active attendant of this store? Used repeatedly
-- across future policies (orders, products) so attendants can act on a store
-- without being confused for its owner.
create function public.is_active_attendant_of(check_user_id uuid, check_store_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.attendants
    where user_id = check_user_id and store_id = check_store_id and is_active = true
  );
$$;

alter table public.sellers enable row level security;
alter table public.attendants enable row level security;

-- SELLERS policies
create policy "Store owner manages own store"
  on public.sellers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Attendants can view (not edit) their assigned store"
  on public.sellers for select
  using (public.is_active_attendant_of(auth.uid(), id));

create policy "Anyone can browse approved, open stores"
  on public.sellers for select
  using (verification_status = 'approved' and is_open = true);

create policy "Admins manage every store"
  on public.sellers for all
  using (public.get_user_role(auth.uid()) = 'admin');

-- ATTENDANTS policies
create policy "Store owner manages their attendants"
  on public.attendants for all
  using (exists (select 1 from public.sellers s where s.id = store_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sellers s where s.id = store_id and s.user_id = auth.uid()));

create policy "Attendant can view own attendant record"
  on public.attendants for select
  using (auth.uid() = user_id);

create policy "Admins manage every attendant record"
  on public.attendants for all
  using (public.get_user_role(auth.uid()) = 'admin');

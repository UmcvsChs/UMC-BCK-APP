-- ── profiles — one row per real auth.users identity ──
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text unique,
  nin text, -- National Identification Number — collected at registration per fraud/security notes
  primary_role public.user_role not null default 'buyer',
  secondary_roles public.user_role[] not null default '{}',
  lga text,
  avatar_url text,
  language_preference text not null default 'en' check (language_preference in ('en','ha','ig','yo')),
  completed_orders_count integer not null default 0, -- drives any future loyalty-based eligibility
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user. Created automatically on signup via handle_new_user trigger below — never insert into this table directly from the client.';

-- Auto-create a profile row the moment someone signs up through Supabase Auth,
-- so the app never has to remember to do this manually and no user can exist
-- without a corresponding profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at honest on every update, everywhere — reused by every table below
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Security-definer helper so RLS policies can check "what role does this user
-- have" without querying profiles from inside a profiles policy — querying a
-- table from its own RLS policy causes infinite recursion in Postgres, this
-- function is the standard, correct way around that.
create function public.get_user_role(check_user_id uuid)
returns public.user_role
language sql security definer stable set search_path = public
as $$
  select primary_role from public.profiles where id = check_user_id;
$$;

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view every profile"
  on public.profiles for select
  using (public.get_user_role(auth.uid()) = 'admin');

create policy "Admins can update every profile"
  on public.profiles for update
  using (public.get_user_role(auth.uid()) = 'admin');

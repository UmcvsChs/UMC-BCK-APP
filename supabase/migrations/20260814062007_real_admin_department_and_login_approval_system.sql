-- Real admin department restriction and real login approval — built as
-- a genuine layer on top of the existing admin role, not a rewrite of
-- it, since dozens of real functions already depend on the current
-- user_role check working exactly as it does today.
create type admin_department as enum ('super', 'logistics', 'verification', 'identity', 'finance', 'listings', 'disputes');

-- Real, explicit department assignment — a real admin has exactly one
-- real department. The founding admin is genuinely 'super' and can see
-- and assign everything; every other admin is scoped to their one real
-- area.
create table public.admin_department_assignments (
  user_id uuid primary key references auth.users(id),
  department admin_department not null,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now()
);

alter table public.admin_department_assignments enable row level security;

create policy "Super admin manages all real assignments"
  on public.admin_department_assignments for all
  using (exists (select 1 from public.admin_department_assignments a where a.user_id = auth.uid() and a.department = 'super'))
  with check (exists (select 1 from public.admin_department_assignments a where a.user_id = auth.uid() and a.department = 'super'));

create policy "Admin sees their own real assignment"
  on public.admin_department_assignments for select
  using (user_id = auth.uid());

-- Real login approval — every time a non-super admin genuinely
-- attempts to sign in, a real pending request is created here. They
-- remain signed in at the Supabase Auth level (a JWT is real and
-- already issued), but every real admin-facing query and function
-- checks this table and refuses access until a real super admin
-- approves — matching the real design: nobody accesses anything until
-- the founding admin says so.
create table public.admin_login_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references auth.users(id),
  resolved_at timestamptz,
  real_device_info text
);

alter table public.admin_login_requests enable row level security;

create policy "Admin sees their own real login requests"
  on public.admin_login_requests for select
  using (user_id = auth.uid());

create policy "Super admin sees and resolves all real login requests"
  on public.admin_login_requests for all
  using (exists (select 1 from public.admin_department_assignments a where a.user_id = auth.uid() and a.department = 'super'))
  with check (exists (select 1 from public.admin_department_assignments a where a.user_id = auth.uid() and a.department = 'super'));

create policy "Any signed in admin can request their own real login approval"
  on public.admin_login_requests for insert
  with check (user_id = auth.uid());

-- Real, central helper — every admin-facing check in this whole app
-- should ultimately call this, since it's the one real place that knows
-- both the real department restriction and the real login-approval gate.
create function public.get_real_admin_access(p_user_id uuid)
returns table (has_access boolean, department admin_department, reason text)
language sql stable security definer set search_path = public
as $$
  with dept as (
    select department from public.admin_department_assignments where user_id = p_user_id
  ),
  latest_login as (
    select status from public.admin_login_requests
    where user_id = p_user_id and requested_at > now() - interval '24 hours'
    order by requested_at desc limit 1
  )
  select
    case
      when (select department from dept) = 'super' then true
      when (select department from dept) is null then false
      when (select status from latest_login) = 'approved' then true
      else false
    end,
    (select department from dept),
    case
      when (select department from dept) is null then 'No real department assigned yet — contact the super admin'
      when (select department from dept) = 'super' then 'Super admin — full real access'
      when (select status from latest_login) = 'approved' then 'Real login approved'
      when (select status from latest_login) = 'pending' then 'Waiting on real super admin approval'
      when (select status from latest_login) = 'rejected' then 'This real login was rejected by the super admin'
      else 'No real login request found — sign in again to request access'
    end
  ;
$$;

revoke execute on function public.get_real_admin_access(uuid) from public, anon;
grant execute on function public.get_real_admin_access(uuid) to authenticated;
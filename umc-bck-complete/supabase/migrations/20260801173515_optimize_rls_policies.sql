-- Two issues, both standard and well-documented:
-- 1) auth.uid() was being re-evaluated per ROW instead of once per query.
--    Wrapping it as (select auth.uid()) lets Postgres treat it as a stable
--    subquery evaluated once — same security semantics, faster at scale.
-- 2) Several tables had multiple separate permissive policies covering the
--    same action (e.g. owner-access and admin-access as two policies for
--    UPDATE) — Postgres must run every permissive policy for a query even
--    though only one needs to pass. Consolidating into one policy per action
--    with OR'd conditions is faster and, with zero rows in these tables
--    right now, costs nothing to fix immediately rather than let the pattern
--    get copied across every table that follows.

-- ── profiles ──
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view every profile" on public.profiles;
drop policy if exists "Admins can update every profile" on public.profiles;

create policy "View own profile or admin views any"
  on public.profiles for select
  using ((select auth.uid()) = id or public.get_user_role((select auth.uid())) = 'admin');

create policy "Update own profile or admin updates any"
  on public.profiles for update
  using ((select auth.uid()) = id or public.get_user_role((select auth.uid())) = 'admin');

-- ── sellers ──
drop policy if exists "Store owner manages own store" on public.sellers;
drop policy if exists "Attendants can view (not edit) their assigned store" on public.sellers;
drop policy if exists "Anyone can browse approved, open stores" on public.sellers;
drop policy if exists "Admins manage every store" on public.sellers;

create policy "View own store, assigned store, open approved stores, or any as admin"
  on public.sellers for select
  using (
    (select auth.uid()) = user_id
    or public.is_active_attendant_of((select auth.uid()), id)
    or (verification_status = 'approved' and is_open = true)
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Owner or admin inserts store"
  on public.sellers for insert
  with check ((select auth.uid()) = user_id or public.get_user_role((select auth.uid())) = 'admin');

create policy "Owner or admin updates store"
  on public.sellers for update
  using ((select auth.uid()) = user_id or public.get_user_role((select auth.uid())) = 'admin');

create policy "Owner or admin deletes store"
  on public.sellers for delete
  using ((select auth.uid()) = user_id or public.get_user_role((select auth.uid())) = 'admin');

-- ── attendants ──
drop policy if exists "Store owner manages their attendants" on public.attendants;
drop policy if exists "Attendant can view own attendant record" on public.attendants;
drop policy if exists "Admins manage every attendant record" on public.attendants;

create policy "View own attendant record, store owner views theirs, or admin views any"
  on public.attendants for select
  using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.sellers s where s.id = store_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Store owner or admin inserts attendant"
  on public.attendants for insert
  with check (
    exists (select 1 from public.sellers s where s.id = store_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Store owner or admin updates attendant"
  on public.attendants for update
  using (
    exists (select 1 from public.sellers s where s.id = store_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Store owner or admin deletes attendant"
  on public.attendants for delete
  using (
    exists (select 1 from public.sellers s where s.id = store_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- Fix the unindexed foreign key while we're here
create index if not exists idx_attendants_store_id on public.attendants(store_id);

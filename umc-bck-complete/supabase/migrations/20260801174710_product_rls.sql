alter table public.products enable row level security;
alter table public.product_vehicle_details enable row level security;
alter table public.product_precious_metal_details enable row level security;
alter table public.product_bulk_medication_details enable row level security;

-- ── products ──
create policy "View live products, own store's products, assigned store's products, or any as admin"
  on public.products for select
  using (
    status = 'live'
    or exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.is_active_attendant_of((select auth.uid()), seller_id)
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- Deliberately NOT granting attendants insert/update/delete — they can view
-- their assigned store's catalogue but never create or edit listings, same
-- restriction as pricing visibility.
create policy "Store owner or admin inserts product"
  on public.products for insert
  with check (
    exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Store owner or admin updates product"
  on public.products for update
  using (
    exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Store owner or admin deletes product"
  on public.products for delete
  using (
    exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- ── detail tables — visibility and edit rights mirror the parent product exactly ──
create policy "View vehicle details if parent product is viewable"
  on public.product_vehicle_details for select
  using (exists (
    select 1 from public.products p
    join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and (p.status = 'live' or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "Store owner or admin writes vehicle details"
  on public.product_vehicle_details for all
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ))
  with check (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "View precious metal details if parent product is viewable"
  on public.product_precious_metal_details for select
  using (exists (
    select 1 from public.products p
    join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and (p.status = 'live' or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "Store owner or admin writes precious metal details"
  on public.product_precious_metal_details for all
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ))
  with check (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "View bulk medication details if parent product is viewable"
  on public.product_bulk_medication_details for select
  using (exists (
    select 1 from public.products p
    join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and (p.status = 'live' or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "Store owner or admin writes bulk medication details"
  on public.product_bulk_medication_details for all
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ))
  with check (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ));

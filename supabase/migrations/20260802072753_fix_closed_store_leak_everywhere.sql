-- Same bug, same fix, applied everywhere it appears — every detail table
-- that mirrors the parent product's visibility rule needs the store's
-- is_open status checked too, not just the product's own status.

drop policy "View vehicle details if parent product is viewable" on public.product_vehicle_details;
create policy "View vehicle details if parent product is viewable"
  on public.product_vehicle_details for select
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and ((p.status = 'live' and s.is_open = true) or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

drop policy "View precious metal details if parent product is viewable" on public.product_precious_metal_details;
create policy "View precious metal details if parent product is viewable"
  on public.product_precious_metal_details for select
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and ((p.status = 'live' and s.is_open = true) or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

drop policy "View bulk medication details if parent product is viewable" on public.product_bulk_medication_details;
create policy "View bulk medication details if parent product is viewable"
  on public.product_bulk_medication_details for select
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and ((p.status = 'live' and s.is_open = true) or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

drop policy "View variants if parent product is viewable" on public.product_variants;
create policy "View variants if parent product is viewable"
  on public.product_variants for select
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and ((p.status = 'live' and s.is_open = true) or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

drop policy "View addons if parent product is viewable" on public.product_addons;
create policy "View addons if parent product is viewable"
  on public.product_addons for select
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and ((p.status = 'live' and s.is_open = true) or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

drop policy "Price history is visible wherever the product itself is visible" on public.product_price_history;
create policy "Price history is visible wherever the product itself is visible"
  on public.product_price_history for select
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and ((p.status = 'live' and s.is_open = true) or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

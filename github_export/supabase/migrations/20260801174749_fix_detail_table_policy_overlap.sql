-- "for all" implicitly includes SELECT, which duplicated the dedicated SELECT
-- policy on each table — same mistake as the first round, caught immediately
-- this time instead of shipping it. Splitting into insert/update/delete only.

drop policy "Store owner or admin writes vehicle details" on public.product_vehicle_details;
drop policy "Store owner or admin writes precious metal details" on public.product_precious_metal_details;
drop policy "Store owner or admin writes bulk medication details" on public.product_bulk_medication_details;

create policy "Store owner or admin inserts vehicle details"
  on public.product_vehicle_details for insert
  with check (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')));
create policy "Store owner or admin updates vehicle details"
  on public.product_vehicle_details for update
  using (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')));
create policy "Store owner or admin deletes vehicle details"
  on public.product_vehicle_details for delete
  using (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')));

create policy "Store owner or admin inserts precious metal details"
  on public.product_precious_metal_details for insert
  with check (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')));
create policy "Store owner or admin updates precious metal details"
  on public.product_precious_metal_details for update
  using (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')));
create policy "Store owner or admin deletes precious metal details"
  on public.product_precious_metal_details for delete
  using (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')));

create policy "Store owner or admin inserts bulk medication details"
  on public.product_bulk_medication_details for insert
  with check (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')));
create policy "Store owner or admin updates bulk medication details"
  on public.product_bulk_medication_details for update
  using (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')));
create policy "Store owner or admin deletes bulk medication details"
  on public.product_bulk_medication_details for delete
  using (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')));

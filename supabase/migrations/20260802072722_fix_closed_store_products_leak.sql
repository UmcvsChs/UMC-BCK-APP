-- Real bug: a buyer couldn't see a closed store's own row, but could still
-- see (and order) its products directly, since the products policy only
-- checked product status, never the owning store's is_open flag. "A closed
-- store must never appear in results" was only half-enforced.
drop policy "View live products, own store's products, assigned store's products, or any as admin" on public.products;

create policy "View live products from open stores, own products, assigned store's products, or any as admin"
  on public.products for select
  using (
    (status = 'live' and exists (select 1 from public.sellers s where s.id = seller_id and s.is_open = true))
    or exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.is_active_attendant_of((select auth.uid()), seller_id)
    or public.get_user_role((select auth.uid())) = 'admin'
  );

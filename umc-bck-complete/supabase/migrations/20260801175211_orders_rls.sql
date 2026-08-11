alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_payments enable row level security;
alter table public.order_instalment_details enable row level security;

-- orders: view if buyer, seller, an attendant of that seller, or admin.
-- No insert/update/delete policy for regular roles at all — creation and
-- every status transition happens inside SECURITY DEFINER functions, which
-- run under their own privileges regardless of what RLS allows the calling
-- role directly. Admin gets a manual-correction escape hatch; nobody gets delete.
create policy "View own orders as buyer, seller, attendant, or admin"
  on public.orders for select
  using (
    (select auth.uid()) = buyer_id
    or exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.is_active_attendant_of((select auth.uid()), seller_id)
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Admin can directly correct an order"
  on public.orders for update
  using (public.get_user_role((select auth.uid())) = 'admin');

-- order_items: visibility mirrors the parent order
create policy "View order items if parent order is viewable"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and ((select auth.uid()) = o.buyer_id
           or exists (select 1 from public.sellers s where s.id = o.seller_id and s.user_id = (select auth.uid()))
           or public.is_active_attendant_of((select auth.uid()), o.seller_id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

-- order_payments: same
create policy "View order payments if parent order is viewable"
  on public.order_payments for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and ((select auth.uid()) = o.buyer_id
           or exists (select 1 from public.sellers s where s.id = o.seller_id and s.user_id = (select auth.uid()))
           or public.is_active_attendant_of((select auth.uid()), o.seller_id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

-- order_instalment_details: same
create policy "View instalment details if parent order is viewable"
  on public.order_instalment_details for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and ((select auth.uid()) = o.buyer_id
           or exists (select 1 from public.sellers s where s.id = o.seller_id and s.user_id = (select auth.uid()))
           or public.is_active_attendant_of((select auth.uid()), o.seller_id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

-- Real, more granular tracking found in the source, specific to food
-- orders: a genuine 'preparing' stage between the seller accepting and a
-- rider being assigned, with a real estimated ready time — not present
-- in the generic order lifecycle at all.
alter type public.order_status add value if not exists 'preparing' after 'confirmed';
alter table public.orders add column est_ready_time timestamptz;

-- mark_order_preparing — real, seller-only, only from a genuinely
-- confirmed order, matching the real lifecycle position exactly.
create function public.mark_order_preparing(p_order_id uuid, p_est_ready_time timestamptz default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_seller_owner uuid; v_status public.order_status;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;

  select s.user_id, o.status into v_seller_owner, v_status
  from public.orders o join public.sellers s on s.id = o.seller_id
  where o.id = p_order_id;

  if v_seller_owner is null then raise exception 'Order not found'; end if;
  if v_seller_owner <> v_caller then raise exception 'Only the store can update this order''s status'; end if;
  if v_status <> 'confirmed' then raise exception 'Order must be confirmed before marking it preparing'; end if;

  update public.orders set status = 'preparing', est_ready_time = p_est_ready_time where id = p_order_id;
end;
$$;

revoke execute on function public.mark_order_preparing(uuid, timestamptz) from public, anon;
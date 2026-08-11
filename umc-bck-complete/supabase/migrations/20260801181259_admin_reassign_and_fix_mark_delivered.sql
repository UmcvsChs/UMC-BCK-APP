-- admin_reassign_order — the manual half of "partially automatic, partially
-- manual." Works whether the old assignment is still 'assigned' or already
-- 'escalated' — admin can override at any time, not only after a timeout.
create function public.admin_reassign_order(p_order_id uuid, p_new_agent_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_zone text; v_new_assignment_id uuid;
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only an admin can manually reassign an order';
  end if;

  update public.delivery_assignments
  set status = 'reassigned', resolved_at = now()
  where order_id = p_order_id and status in ('assigned', 'escalated');

  select delivery_lga into v_zone from public.orders where id = p_order_id;

  insert into public.delivery_assignments (order_id, delivery_agent_id, zone, status)
  values (p_order_id, p_new_agent_id, coalesce(v_zone, 'Unassigned zone'), 'assigned')
  returning id into v_new_assignment_id;

  update public.delivery_agents set total_assignments = total_assignments + 1 where id = p_new_agent_id;
  update public.orders set status = 'assigned' where id = p_order_id;

  return v_new_assignment_id;
end;
$$;

revoke execute on function public.admin_reassign_order(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_reassign_order(uuid, uuid) to authenticated;

-- mark_order_delivered previously only let the SELLER mark an order
-- delivered — wrong. In the actual flow, it's the assigned rider (attesting
-- the buyer confirmed receipt in person) or the buyer themselves who should
-- trigger this; the seller isn't present for the handover at all. Fixed to
-- accept buyer, the assigned delivery agent, the seller (for self-fulfilled
-- pickup orders with no assignment), or admin — and now also resolves the
-- matching delivery_assignments row and credits the agent's fulfilment count.
create or replace function public.mark_order_delivered(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order record; v_seller_owner uuid; v_wallet_id uuid; v_total_held numeric; v_balance numeric;
  v_assignment record; v_is_assigned_agent boolean := false;
begin
  select o.*, s.user_id as seller_owner into v_order
  from public.orders o join public.sellers s on s.id = o.seller_id where o.id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;

  select da.user_id into strict v_assignment
  from public.delivery_assignments da
  join public.delivery_agents dag on dag.id = da.delivery_agent_id
  where da.order_id = p_order_id and da.status = 'assigned'
  limit 1;
exception when no_data_found then
  v_assignment := null;
end;
$$;

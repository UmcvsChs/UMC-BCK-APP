-- auto_assign_order — the actual mechanism that prevents multiple riders
-- racing for the same order: it picks exactly one, and only that rider ever
-- sees it. Zone match is scored first (an agent covering the buyer's actual
-- LGA beats acceptance rate alone), acceptance rate breaks every tie —
-- consistency, exactly as originally specified, not just proximity.
create function public.auto_assign_order(p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_order record; v_agent record; v_assignment_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;

  select da.id, da.user_id into v_agent
  from public.delivery_agents_with_rate da
  where da.is_online = true and da.verification_status = 'approved'
  order by (da.zone = v_order.delivery_lga) desc, coalesce(da.acceptance_rate, 0) desc
  limit 1;

  if v_agent.id is null then
    return null; -- no agent available — order stays 'confirmed' until an admin manually assigns one
  end if;

  insert into public.delivery_assignments (order_id, delivery_agent_id, zone, status)
  values (p_order_id, v_agent.id, coalesce(v_order.delivery_lga, 'Unassigned zone'), 'assigned')
  returning id into v_assignment_id;

  update public.delivery_agents set total_assignments = total_assignments + 1 where id = v_agent.id;
  update public.orders set status = 'assigned' where id = p_order_id;

  return v_assignment_id;
end;
$$;

revoke execute on function public.auto_assign_order(uuid) from public, anon, authenticated;

-- confirm_order now triggers assignment as part of the same call — a seller
-- confirming an order and a rider being found for it are one atomic action
-- from the seller's point of view, matching the prototype's UX exactly.
create or replace function public.confirm_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_seller_owner uuid; v_status public.order_status;
begin
  select s.user_id, o.status into v_seller_owner, v_status
  from public.orders o join public.sellers s on s.id = o.seller_id
  where o.id = p_order_id;
  if v_seller_owner is null then raise exception 'Order not found'; end if;
  if v_seller_owner <> auth.uid() and public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only the store that owns this order can confirm it';
  end if;
  if v_status <> 'new' then raise exception 'Order is % and cannot be confirmed', v_status; end if;

  update public.orders set status = 'confirmed' where id = p_order_id;
  perform public.auto_assign_order(p_order_id);
end;
$$;

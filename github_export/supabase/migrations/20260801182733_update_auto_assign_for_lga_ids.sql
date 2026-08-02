create or replace function public.auto_assign_order(p_order_id uuid)
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
  order by (da.lga_id = v_order.delivery_lga_id) desc, coalesce(da.acceptance_rate, 0) desc
  limit 1;

  if v_agent.id is null then
    return null;
  end if;

  insert into public.delivery_assignments (order_id, delivery_agent_id, zone, status)
  select p_order_id, v_agent.id, coalesce(l.name, 'Unassigned zone'), 'assigned'
  from (select v_order.delivery_lga_id as lga_id) x
  left join public.local_government_areas l on l.id = x.lga_id
  returning id into v_assignment_id;

  update public.delivery_agents set total_assignments = total_assignments + 1 where id = v_agent.id;
  update public.orders set status = 'assigned' where id = p_order_id;

  return v_assignment_id;
end;
$$;

revoke execute on function public.auto_assign_order(uuid) from public, anon, authenticated;

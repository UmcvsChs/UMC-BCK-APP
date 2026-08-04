-- Same gap as auto_assign_order(), found by checking the manual reassignment
-- path too rather than assuming only the automated one needed the fix.
-- Admin could accidentally double-book an agent who already has an active
-- delivery — this is a human-facing action, so a clear error (forcing a
-- deliberate choice) is the right guard, not a silent allowance.
create or replace function public.admin_reassign_order(p_order_id uuid, p_new_agent_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_zone_name text; v_new_assignment_id uuid; v_already_busy boolean;
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only an admin can manually reassign an order';
  end if;

  select exists (
    select 1 from public.delivery_assignments a
    where a.delivery_agent_id = p_new_agent_id and a.status in ('assigned', 'escalated')
  ) into v_already_busy;
  if v_already_busy then
    raise exception 'This agent already has an active delivery — choose a different agent or wait until they free up';
  end if;

  update public.delivery_assignments
  set status = 'reassigned', resolved_at = now()
  where order_id = p_order_id and status in ('assigned', 'escalated');

  select l.name into v_zone_name
  from public.orders o
  left join public.local_government_areas l on l.id = o.delivery_lga_id
  where o.id = p_order_id;

  insert into public.delivery_assignments (order_id, delivery_agent_id, zone, status)
  values (p_order_id, p_new_agent_id, coalesce(v_zone_name, 'Unassigned zone'), 'assigned')
  returning id into v_new_assignment_id;

  update public.delivery_agents set total_assignments = total_assignments + 1 where id = p_new_agent_id;
  update public.orders set status = 'assigned' where id = p_order_id;

  return v_new_assignment_id;
end;
$$;
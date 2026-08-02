-- Real wait-time tracking — arrived_at is set by the agent when they
-- actually get to the pickup/dropoff point and start waiting, not inferred
-- or estimated. The fine is only ever computed from this real timestamp.
alter table public.delivery_assignments add column arrived_at timestamptz;

create function public.record_agent_arrival(p_assignment_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_agent_owner uuid; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select da.user_id into v_agent_owner
  from public.delivery_assignments a join public.delivery_agents da on da.id = a.delivery_agent_id
  where a.id = p_assignment_id;
  if v_agent_owner is null then raise exception 'Assignment not found'; end if;
  if v_agent_owner <> v_caller then raise exception 'Only the assigned agent can record arrival'; end if;

  update public.delivery_assignments set arrived_at = now() where id = p_assignment_id;
end;
$$;

-- assess_waiting_fine — 10 minutes free, ₦50/min after, capped at ₦1,000
-- (i.e. 30 minutes total wait), split 70% to the agent / 30% retained by the
-- platform. Only the agent can trigger this, and only once, against a real
-- elapsed wait — never an estimate.
create function public.assess_waiting_fine(p_assignment_id uuid)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  v_assignment record; v_agent_owner uuid; v_caller uuid := auth.uid();
  v_buyer_id uuid; v_wait_minutes numeric; v_fine numeric; v_agent_share numeric;
  v_buyer_wallet uuid; v_agent_wallet uuid; v_hold_txn uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;

  select a.*, da.user_id as agent_owner, o.buyer_id
  into v_assignment
  from public.delivery_assignments a
  join public.delivery_agents da on da.id = a.delivery_agent_id
  join public.orders o on o.id = a.order_id
  where a.id = p_assignment_id;

  if v_assignment.id is null then raise exception 'Assignment not found'; end if;
  if v_assignment.agent_owner <> v_caller then raise exception 'Only the assigned agent can assess a waiting fine'; end if;
  if v_assignment.arrived_at is null then raise exception 'Arrival was never recorded for this assignment'; end if;

  v_wait_minutes := extract(epoch from (now() - v_assignment.arrived_at)) / 60;
  if v_wait_minutes <= 10 then
    return 0; -- within the free window, nothing to charge
  end if;

  v_fine := least((v_wait_minutes - 10) * 50, 1000);
  v_agent_share := round(v_fine * 0.7, 2);

  select id into v_buyer_wallet from public.wallets where user_id = v_assignment.buyer_id;
  select id into v_agent_wallet from public.wallets where user_id = v_assignment.agent_owner;

  perform public.place_wallet_hold(v_buyer_wallet, v_fine, 'waiting_fine', p_assignment_id, 'Waiting time fine');
  perform public.finalize_wallet_hold(v_buyer_wallet, v_fine, 'waiting_fine', p_assignment_id, 'Waiting time fine charged');
  perform public.credit_wallet(v_agent_wallet, v_agent_share, 'waiting_fine', p_assignment_id, 'Waiting time fine — your share', v_caller);

  return v_fine;
end;
$$;

revoke execute on function public.record_agent_arrival(uuid) from public, anon;
revoke execute on function public.assess_waiting_fine(uuid) from public, anon;

comment on function public.assess_waiting_fine is '10 min free, ₦50/min after, capped at ₦1,000 (30 min total wait), 70% to the agent, 30% retained by the platform (not credited anywhere — there is no platform wallet, this is simply the agent not receiving that portion).';
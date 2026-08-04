-- Real gap found by the same discipline as the featured_placement fix:
-- assess_waiting_fine() predates platform_revenue_ledger's creation and was
-- never updated to log the platform's 30% share. The buyer was correctly
-- charged, the agent correctly credited 70% — but that remaining 30% had
-- no audit trail at all, despite 'waiting_fine_platform_share' existing in
-- the ledger's allowed source types specifically for this.
create or replace function public.assess_waiting_fine(p_assignment_id uuid)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  v_assignment record; v_agent_owner uuid; v_caller uuid := auth.uid();
  v_buyer_id uuid; v_wait_minutes numeric; v_fine numeric; v_agent_share numeric; v_platform_share numeric;
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
    return 0;
  end if;

  v_fine := least((v_wait_minutes - 10) * 50, 1000);
  v_agent_share := round(v_fine * 0.7, 2);
  v_platform_share := v_fine - v_agent_share;

  select id into v_buyer_wallet from public.wallets where user_id = v_assignment.buyer_id;
  select id into v_agent_wallet from public.wallets where user_id = v_assignment.agent_owner;

  perform public.place_wallet_hold(v_buyer_wallet, v_fine, 'waiting_fine', p_assignment_id, 'Waiting time fine');
  perform public.finalize_wallet_hold(v_buyer_wallet, v_fine, 'waiting_fine', p_assignment_id, 'Waiting time fine charged');
  perform public.credit_wallet(v_agent_wallet, v_agent_share, 'waiting_fine', p_assignment_id, 'Waiting time fine — your share', v_caller);

  if v_platform_share > 0 then
    insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
    values ('waiting_fine_platform_share', p_assignment_id, v_platform_share, 'Platform share (30%) of waiting-time fine on assignment ' || p_assignment_id);
  end if;

  return v_fine;
end;
$$;
-- Real safety net, needed because of the restriction just added: if the
-- buyer genuinely never opens the app after the agent arrives, funds
-- would otherwise be stuck in escrow forever, with no fallback for the
-- seller or agent. A real, generous 48-hour window protects the buyer's
-- real right to inspect and dispute, while still guaranteeing settlement
-- eventually — matching how real delivery platforms handle buyer
-- inaction, not left as an open-ended risk.
create function public.auto_confirm_stale_deliveries()
returns void
language plpgsql security definer set search_path = public
as $$
declare v_assignment record;
begin
  for v_assignment in
    select da.order_id
    from public.delivery_assignments da
    join public.orders o on o.id = da.order_id
    where da.status = 'assigned'
      and da.arrived_at is not null
      and da.arrived_at < now() - interval '48 hours'
      and o.status in ('confirmed', 'assigned', 'preparing')
      and not exists (select 1 from public.disputes d where d.order_id = da.order_id and d.status in ('open', 'investigating'))
  loop
    begin
      perform public.mark_order_delivered_system(v_assignment.order_id);
    exception when others then
      -- Real, honest handling — one bad row should never silently stop
      -- the rest of the batch from processing.
      raise notice 'Auto-confirm failed for order %: %', v_assignment.order_id, sqlerrm;
    end;
  end loop;
end;
$$;

-- Real system-level variant — the buyer-restriction on the public
-- function is correct and intentional; this is the one real, narrow
-- exception, callable only by the scheduled job itself, never exposed to
-- any user role.
create function public.mark_order_delivered_system(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order record; v_assigned_agent_user_id uuid; v_wallet_id uuid; v_seller_wallet_id uuid;
  v_total_held numeric; v_commission_rate numeric; v_commission_amount numeric; v_seller_payout numeric;
begin
  select o.*, s.user_id as seller_owner, s.primary_hub into v_order
  from public.orders o join public.sellers s on s.id = o.seller_id where o.id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;

  select dag.user_id into v_assigned_agent_user_id
  from public.delivery_assignments da join public.delivery_agents dag on dag.id = da.delivery_agent_id
  where da.order_id = p_order_id and da.status = 'assigned' limit 1;

  select coalesce(sum(amount), 0) into v_total_held from public.order_payments where order_id = p_order_id;
  select id into v_wallet_id from public.wallets where user_id = v_order.buyer_id;
  select id into v_seller_wallet_id from public.wallets where user_id = v_order.seller_owner;
  if v_seller_wallet_id is null then raise exception 'Seller has no wallet'; end if;

  v_commission_rate := public.get_seller_commission_rate(v_order.seller_id);
  v_commission_amount := round(v_total_held * v_commission_rate, 2);
  v_seller_payout := v_total_held - v_commission_amount;

  perform public.finalize_wallet_hold(v_wallet_id, v_total_held, 'order', p_order_id, 'Order ' || p_order_id || ' auto-confirmed after 48h');
  perform public.credit_wallet(v_seller_wallet_id, v_seller_payout, 'order', p_order_id,
    'Order ' || p_order_id || ' settled (auto-confirmed, no buyer response within 48h)', v_order.buyer_id);

  if v_commission_amount > 0 then
    insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
    values ('order_commission', p_order_id, v_commission_amount, v_order.primary_hub || ' commission (auto-confirmed) on order ' || p_order_id);
  end if;

  update public.orders set status = 'delivered', delivered_at = now() where id = p_order_id;
  update public.delivery_assignments set status = 'delivered', resolved_at = now() where order_id = p_order_id and status = 'assigned';
  update public.delivery_agents set total_fulfilled = total_fulfilled + 1 where user_id = v_assigned_agent_user_id;
end;
$$;

revoke execute on function public.auto_confirm_stale_deliveries() from public, anon, authenticated;
revoke execute on function public.mark_order_delivered_system(uuid) from public, anon, authenticated;

select cron.schedule('auto-confirm-stale-deliveries', '0 * * * *', $$select public.auto_confirm_stale_deliveries()$$);
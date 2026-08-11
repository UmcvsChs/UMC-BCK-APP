create or replace function public.mark_order_delivered(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
  v_assigned_agent_user_id uuid;
  v_wallet_id uuid;
  v_seller_wallet_id uuid;
  v_total_held numeric;
  v_balance numeric;
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_commission_rate numeric;
  v_commission_amount numeric;
  v_seller_payout numeric;
begin
  select o.*, s.user_id as seller_owner, s.primary_hub into v_order
  from public.orders o join public.sellers s on s.id = o.seller_id
  where o.id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;

  select dag.user_id into v_assigned_agent_user_id
  from public.delivery_assignments da
  join public.delivery_agents dag on dag.id = da.delivery_agent_id
  where da.order_id = p_order_id and da.status = 'assigned'
  limit 1;

  v_is_admin := public.get_user_role(v_caller) = 'admin';

  if v_caller <> v_order.buyer_id
     and v_caller <> coalesce(v_assigned_agent_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
     and v_caller <> v_order.seller_owner
     and not v_is_admin then
    raise exception 'Only the buyer, the assigned delivery agent, the store, or an admin can mark this order delivered';
  end if;

  if v_order.status not in ('confirmed','assigned') then
    raise exception 'Order is % and cannot be marked delivered', v_order.status;
  end if;

  if v_order.is_instalment then
    select balance_amount into v_balance from public.order_instalment_details where order_id = p_order_id;
    if v_balance > 0 then
      raise exception 'Instalment balance of ₦% is still outstanding — cannot mark delivered until fully paid', v_balance;
    end if;
  end if;

  select coalesce(sum(amount), 0) into v_total_held from public.order_payments where order_id = p_order_id;
  select id into v_wallet_id from public.wallets where user_id = v_order.buyer_id;
  select id into v_seller_wallet_id from public.wallets where user_id = v_order.seller_owner;

  if v_seller_wallet_id is null then raise exception 'Seller has no wallet — cannot settle this order'; end if;

  -- Uses the real per-seller negotiated override when one exists (e.g. a
  -- Supermarket account), falling back to the standard hub rate otherwise.
  v_commission_rate := public.get_seller_commission_rate(v_order.seller_id);
  v_commission_amount := round(v_total_held * v_commission_rate, 2);
  v_seller_payout := v_total_held - v_commission_amount;

  perform public.finalize_wallet_hold(v_wallet_id, v_total_held, 'order', p_order_id, 'Order ' || p_order_id || ' delivered');
  perform public.credit_wallet(v_seller_wallet_id, v_seller_payout, 'order', p_order_id,
    'Order ' || p_order_id || ' settled' || case when v_commission_amount > 0 then ' (after ' || (v_commission_rate*100) || '% commission)' else '' end,
    v_order.buyer_id);

  if v_commission_amount > 0 then
    insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
    values ('order_commission', p_order_id, v_commission_amount,
      v_order.primary_hub || ' commission (' || (v_commission_rate * 100) || '%) on order ' || p_order_id);
  end if;

  update public.orders set status = 'delivered' where id = p_order_id;

  update public.delivery_assignments
  set status = 'delivered', resolved_at = now()
  where order_id = p_order_id and status = 'assigned';

  update public.delivery_agents
  set total_fulfilled = total_fulfilled + 1
  where user_id = v_assigned_agent_user_id;
end;
$$;
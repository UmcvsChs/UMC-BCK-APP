create or replace function public.mark_order_delivered(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
  v_assigned_agent_user_id uuid;
  v_wallet_id uuid;
  v_total_held numeric;
  v_balance numeric;
  v_caller uuid := auth.uid();
  v_is_admin boolean;
begin
  select o.*, s.user_id as seller_owner into v_order
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

  perform public.finalize_wallet_hold(v_wallet_id, v_total_held, 'order', p_order_id, 'Order ' || p_order_id || ' delivered');

  update public.orders set status = 'delivered' where id = p_order_id;

  update public.delivery_assignments
  set status = 'delivered', resolved_at = now()
  where order_id = p_order_id and status = 'assigned';

  update public.delivery_agents
  set total_fulfilled = total_fulfilled + 1
  where user_id = v_assigned_agent_user_id;
end;
$$;

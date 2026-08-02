-- make_instalment_payment — buyer pays another chunk toward the balance.
-- Each payment is itself another wallet hold, not an immediate debit — the
-- money stays protected in escrow, same as the deposit, until delivery
-- actually happens. Nothing is "spent" until mark_order_delivered finalizes it.
create function public.make_instalment_payment(p_order_id uuid, p_amount numeric)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_order record; v_detail record; v_wallet_id uuid; v_hold_txn_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.buyer_id <> auth.uid() then raise exception 'Only the buyer can make a payment on this order'; end if;
  if not v_order.is_instalment then raise exception 'This is not an instalment order'; end if;
  if v_order.status not in ('new','confirmed','assigned') then raise exception 'Order is % and no longer accepts payments', v_order.status; end if;

  select * into v_detail from public.order_instalment_details where order_id = p_order_id;
  if p_amount <= 0 then raise exception 'Payment amount must be positive'; end if;
  if p_amount > v_detail.balance_amount then raise exception 'Payment (₦%) exceeds remaining balance (₦%)', p_amount, v_detail.balance_amount; end if;

  select id into v_wallet_id from public.wallets where user_id = auth.uid();
  select public.place_wallet_hold(v_wallet_id, p_amount, 'order', p_order_id, 'Instalment payment on order ' || p_order_id) into v_hold_txn_id;

  insert into public.order_payments (order_id, amount, payment_type, wallet_transaction_id)
  values (p_order_id, p_amount, 'instalment_payment', v_hold_txn_id);

  update public.order_instalment_details set balance_amount = balance_amount - p_amount where order_id = p_order_id;
end;
$$;

-- mark_order_delivered — finalizes every hold collected against this order in
-- one clean debit+release pair. For instalment orders this only makes sense
-- once the balance is fully paid, matching the prototype's stated policy that
-- an instalment item is held by the seller until fully paid.
create function public.mark_order_delivered(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_order record; v_seller_owner uuid; v_wallet_id uuid; v_total_held numeric; v_balance numeric;
begin
  select o.*, s.user_id as seller_owner into v_order from public.orders o
    join public.sellers s on s.id = o.seller_id where o.id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.seller_owner <> auth.uid() and public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only the store that owns this order can mark it delivered';
  end if;
  if v_order.status not in ('confirmed','assigned') then raise exception 'Order is % and cannot be marked delivered', v_order.status; end if;

  if v_order.is_instalment then
    select balance_amount into v_balance from public.order_instalment_details where order_id = p_order_id;
    if v_balance > 0 then raise exception 'Instalment balance of ₦% is still outstanding — cannot mark delivered until fully paid', v_balance; end if;
  end if;

  select coalesce(sum(amount), 0) into v_total_held from public.order_payments where order_id = p_order_id;
  select id into v_wallet_id from public.wallets where user_id = v_order.buyer_id;

  perform public.finalize_wallet_hold(v_wallet_id, v_total_held, 'order', p_order_id, 'Order ' || p_order_id || ' delivered');
  update public.orders set status = 'delivered' where id = p_order_id;
end;
$$;

-- cancel_instalment_order — the buyer-initiated cancellation with the tiered
-- refund policy: full refund inside 7 days, an 20%-fee partial refund between
-- 7 and 90 days, and no refund at all past 90 days (deposit forfeit, though
-- it may still be transferable to a different item — that workflow is an
-- application-layer decision, not something this function does on its own).
create function public.cancel_instalment_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_order record; v_detail record; v_wallet_id uuid; v_total_held numeric; v_fee numeric; v_refund numeric;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.buyer_id <> auth.uid() then raise exception 'Only the buyer can cancel this order'; end if;
  if not v_order.is_instalment then raise exception 'This is not an instalment order — use reject_order or the standard cancellation path instead'; end if;
  if v_order.status not in ('new','confirmed','assigned') then raise exception 'Order is % and cannot be cancelled', v_order.status; end if;

  select * into v_detail from public.order_instalment_details where order_id = p_order_id;
  select coalesce(sum(amount), 0) into v_total_held from public.order_payments where order_id = p_order_id;
  select id into v_wallet_id from public.wallets where user_id = v_order.buyer_id;

  if now() <= v_detail.refund_full_until then
    perform public.release_wallet_hold(v_wallet_id, v_total_held, 'order', p_order_id, 'Instalment order cancelled within full-refund window');
  elsif now() <= v_detail.refund_partial_until then
    v_fee := round(v_total_held * v_detail.refund_partial_fee_pct / 100, 2);
    v_refund := v_total_held - v_fee;
    perform public.finalize_wallet_hold(v_wallet_id, v_fee, 'order', p_order_id, 'Cancellation fee (' || v_detail.refund_partial_fee_pct || '%)');
    perform public.release_wallet_hold(v_wallet_id, v_refund, 'order', p_order_id, 'Instalment order cancelled — partial refund after cancellation fee');
  else
    raise exception 'This order is past the 90-day refund window — the deposit is non-refundable. It may be transferable to a different item; that is handled separately, not by cancelling.';
  end if;

  update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;

revoke execute on function public.make_instalment_payment(uuid, numeric) from public, anon;
revoke execute on function public.mark_order_delivered(uuid) from public, anon;
revoke execute on function public.cancel_instalment_order(uuid) from public, anon;

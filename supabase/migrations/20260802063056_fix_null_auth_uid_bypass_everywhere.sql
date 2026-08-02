-- Real bug, found by the advisor flagging unexpected anon access, not by
-- inspection: `real_value <> auth.uid()` silently evaluates to NULL (not
-- true) when auth.uid() is NULL (an anonymous caller) — and `if NULL then`
-- in PL/pgSQL is treated as false, so the exception never fires and the
-- function proceeds as if the check passed. Revoking anon execute mitigates
-- this where it was already done, but the underlying logic was wrong
-- regardless of grants — fixing it properly everywhere it appears, not
-- just where it happened to be currently reachable.

create or replace function public.accept_trade_in_counter(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_submitter uuid; v_status public.trade_in_status;
begin
  select submitted_by, status into v_submitter, v_status from public.trade_in_offers where id = p_offer_id;
  if v_submitter is null then raise exception 'Trade-in offer not found'; end if;
  if auth.uid() is null or v_submitter <> auth.uid() then raise exception 'Only the person who submitted this offer can accept it'; end if;
  if v_status <> 'countered' then raise exception 'Offer is % — nothing to accept', v_status; end if;
  update public.trade_in_offers set status = 'accepted' where id = p_offer_id;
end;
$$;

create or replace function public.respond_to_trade_in_offer(p_offer_id uuid, p_action text, p_seller_offer_price numeric default null, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_status public.trade_in_status;
begin
  select s.user_id, o.status into v_owner, v_status
  from public.trade_in_offers o join public.sellers s on s.id = o.seller_id
  where o.id = p_offer_id;
  if v_owner is null then raise exception 'Trade-in offer not found'; end if;
  if auth.uid() is null or (v_owner <> auth.uid() and public.get_user_role(auth.uid()) <> 'admin') then
    raise exception 'Only the store this offer was submitted to can respond';
  end if;
  if v_status not in ('pending','countered') then raise exception 'Offer is % and cannot be responded to', v_status; end if;

  if p_action = 'counter' then
    if p_seller_offer_price is null then raise exception 'A counter requires a price'; end if;
    update public.trade_in_offers set status = 'countered', seller_offer_price = p_seller_offer_price, seller_notes = p_notes where id = p_offer_id;
  elsif p_action = 'accept' then
    if p_seller_offer_price is null then raise exception 'Accepting requires a final agreed price'; end if;
    update public.trade_in_offers set status = 'accepted', seller_offer_price = p_seller_offer_price, seller_notes = p_notes where id = p_offer_id;
  elsif p_action = 'decline' then
    update public.trade_in_offers set status = 'declined', seller_notes = p_notes where id = p_offer_id;
  else
    raise exception 'Unknown action %, expected counter/accept/decline', p_action;
  end if;
end;
$$;

create or replace function public.request_wallet_topup(p_wallet_id uuid, p_amount numeric, p_payment_reference text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_topup_id uuid; v_owner uuid;
begin
  select user_id into v_owner from public.wallets where id = p_wallet_id;
  if auth.uid() is null or v_owner is null or v_owner <> auth.uid() then
    raise exception 'You can only request a top-up for your own wallet';
  end if;
  if p_amount <= 0 then raise exception 'Top-up amount must be positive'; end if;
  insert into public.wallet_topup_requests (wallet_id, amount, payment_reference)
  values (p_wallet_id, p_amount, p_payment_reference)
  returning id into v_topup_id;
  return v_topup_id;
end;
$$;

create or replace function public.cancel_instalment_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_order record; v_detail record; v_wallet_id uuid; v_total_held numeric; v_fee numeric; v_refund numeric;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if auth.uid() is null or v_order.buyer_id <> auth.uid() then raise exception 'Only the buyer can cancel this order'; end if;
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

create or replace function public.complete_trade_in_cash_buyback(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_offer record; v_seller_owner uuid; v_seller_wallet uuid; v_buyer_wallet uuid;
begin
  select o.*, s.user_id as seller_owner into v_offer
  from public.trade_in_offers o join public.sellers s on s.id = o.seller_id
  where o.id = p_offer_id;
  if v_offer.id is null then raise exception 'Trade-in offer not found'; end if;
  if auth.uid() is null or (v_offer.seller_owner <> auth.uid() and public.get_user_role(auth.uid()) <> 'admin') then
    raise exception 'Only the store can complete this buyback';
  end if;
  if v_offer.status <> 'accepted' then raise exception 'Offer is % — must be accepted before completing', v_offer.status; end if;
  if v_offer.desired_outcome <> 'cash_buyback' then raise exception 'This offer is an exchange, not a cash buyback — use the exchange credit manually against a new order instead'; end if;

  select id into v_seller_wallet from public.wallets where user_id = v_offer.seller_owner;
  select id into v_buyer_wallet from public.wallets where user_id = v_offer.submitted_by;

  perform public.place_wallet_hold(v_seller_wallet, v_offer.seller_offer_price, 'trade_in', p_offer_id, 'Trade-in buyback: ' || v_offer.item_description);
  perform public.finalize_wallet_hold(v_seller_wallet, v_offer.seller_offer_price, 'trade_in', p_offer_id, 'Trade-in buyback paid out');
  perform public.credit_wallet(v_buyer_wallet, v_offer.seller_offer_price, 'trade_in', p_offer_id, 'Trade-in buyback received', v_offer.seller_owner);

  update public.trade_in_offers set status = 'completed' where id = p_offer_id;
end;
$$;

create or replace function public.confirm_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_seller_owner uuid; v_status public.order_status;
begin
  select s.user_id, o.status into v_seller_owner, v_status
  from public.orders o join public.sellers s on s.id = o.seller_id
  where o.id = p_order_id;
  if v_seller_owner is null then raise exception 'Order not found'; end if;
  if auth.uid() is null or (v_seller_owner <> auth.uid() and public.get_user_role(auth.uid()) <> 'admin') then
    raise exception 'Only the store that owns this order can confirm it';
  end if;
  if v_status <> 'new' then raise exception 'Order is % and cannot be confirmed', v_status; end if;
  update public.orders set status = 'confirmed' where id = p_order_id;
  perform public.auto_assign_order(p_order_id);
end;
$$;

create or replace function public.reject_order(p_order_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_seller_owner uuid; v_status public.order_status; v_wallet_id uuid; v_held numeric;
begin
  select s.user_id, o.status, w.id into v_seller_owner, v_status, v_wallet_id
  from public.orders o
  join public.sellers s on s.id = o.seller_id
  join public.wallets w on w.user_id = o.buyer_id
  where o.id = p_order_id;
  if v_seller_owner is null then raise exception 'Order not found'; end if;
  if auth.uid() is null or (v_seller_owner <> auth.uid() and public.get_user_role(auth.uid()) <> 'admin') then
    raise exception 'Only the store that owns this order can reject it';
  end if;
  if v_status not in ('new', 'confirmed') then raise exception 'Order is % and cannot be rejected', v_status; end if;

  select coalesce(sum(amount), 0) into v_held from public.order_payments where order_id = p_order_id;
  if v_held > 0 then
    perform public.release_wallet_hold(v_wallet_id, v_held, 'order', p_order_id, coalesce('Order rejected: ' || p_reason, 'Order rejected by seller'));
  end if;
  update public.orders set status = 'rejected' where id = p_order_id;
end;
$$;

create or replace function public.make_instalment_payment(p_order_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare v_order record; v_detail record; v_wallet_id uuid; v_hold_txn_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if auth.uid() is null or v_order.buyer_id <> auth.uid() then raise exception 'Only the buyer can make a payment on this order'; end if;
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

-- Close the anon exposure directly too, not just the logic — defense in depth, not either/or.
revoke execute on function public.accept_trade_in_counter(uuid) from public, anon;
revoke execute on function public.respond_to_trade_in_offer(uuid, text, numeric, text) from public, anon;
revoke execute on function public.submit_trade_in_offer(uuid, text, public.trade_in_outcome, text, numeric, text[], numeric) from public, anon;

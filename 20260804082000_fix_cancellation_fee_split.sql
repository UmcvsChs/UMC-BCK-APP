-- Third instance of the same pattern, found by systematically checking
-- every finalize_wallet_hold() caller rather than stopping after the first
-- two fixes. The T&C (Part B) explicitly promises the partial-window
-- cancellation fee splits 10% to the seller as compensation, 10% to
-- UMC-BCK as platform fee — but the buyer's fee was only ever debited,
-- never actually sent anywhere.
create or replace function public.cancel_instalment_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order record; v_detail record; v_wallet_id uuid; v_total_held numeric;
  v_fee numeric; v_refund numeric; v_seller_share numeric; v_platform_share numeric; v_seller_wallet_id uuid;
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
    v_seller_share := round(v_fee / 2, 2);
    v_platform_share := v_fee - v_seller_share;

    select id into v_seller_wallet_id from public.wallets where user_id = (select user_id from public.sellers where id = v_order.seller_id);

    perform public.finalize_wallet_hold(v_wallet_id, v_fee, 'order', p_order_id, 'Cancellation fee (' || v_detail.refund_partial_fee_pct || '%)');
    perform public.release_wallet_hold(v_wallet_id, v_refund, 'order', p_order_id, 'Instalment order cancelled — partial refund after cancellation fee');

    if v_seller_wallet_id is not null then
      perform public.credit_wallet(v_seller_wallet_id, v_seller_share, 'cancellation_fee', p_order_id,
        'Cancellation compensation for order ' || p_order_id, v_order.buyer_id);
    end if;

    insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
    values ('order_commission', p_order_id, v_platform_share, 'Platform share of cancellation fee on order ' || p_order_id);
  else
    raise exception 'This order is past the 90-day refund window — the deposit is non-refundable. It may be transferable to a different item; that is handled separately, not by cancelling.';
  end if;

  update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;
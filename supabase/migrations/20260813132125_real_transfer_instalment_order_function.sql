-- The one real, genuine gap found after locating the correct existing
-- system — a real way to transfer a non-refundable deposit (past the
-- 90-day window) to a different item from the same seller, at that
-- item's real prevailing price, exactly as the real policy describes.
create function public.transfer_instalment_order(p_order_id uuid, p_new_product_id uuid, p_new_quantity integer default 1)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
  v_detail record;
  v_new_product record;
  v_new_total numeric;
  v_new_order_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if auth.uid() is null or v_order.buyer_id <> auth.uid() then raise exception 'Only the buyer can transfer this order'; end if;
  if not v_order.is_instalment then raise exception 'This is not an instalment order'; end if;

  select * into v_detail from public.order_instalment_details where order_id = p_order_id;
  if now() <= v_detail.refund_partial_until then
    raise exception 'This real deposit is still within a refundable window — cancel it directly instead of transferring.';
  end if;

  select id, price, seller_id into v_new_product from public.products where id = p_new_product_id;
  if v_new_product.id is null then raise exception 'That real product could not be found.'; end if;
  if v_new_product.seller_id <> v_order.seller_id then
    raise exception 'A real transfer can only move to a different item from the same seller.';
  end if;

  v_new_total := v_new_product.price * p_new_quantity;

  insert into public.orders (buyer_id, seller_id, total_amount, subtotal, status, is_instalment, delivery_type)
  values (v_order.buyer_id, v_order.seller_id, v_new_total, v_new_total, 'new', true, v_order.delivery_type)
  returning id into v_new_order_id;

  insert into public.order_instalment_details (order_id, deposit_amount, balance_amount, refund_full_until, refund_partial_until, refund_partial_fee_pct)
  values (v_new_order_id, v_detail.deposit_amount, v_new_total - v_detail.deposit_amount, now(), now(), v_detail.refund_partial_fee_pct);

  update public.orders set status = 'cancelled' where id = p_order_id;

  return v_new_order_id;
end;
$$;

revoke execute on function public.transfer_instalment_order(uuid, uuid, integer) from public, anon;
grant execute on function public.transfer_instalment_order(uuid, uuid, integer) to authenticated;
drop function public.place_order(uuid, jsonb, text, text, numeric, boolean, numeric);

create function public.place_order(
  p_seller_id uuid,
  p_items jsonb,
  p_delivery_address text default null,
  p_delivery_lga_id uuid default null,
  p_delivery_fee numeric default 0,
  p_is_instalment boolean default false,
  p_deposit_amount numeric default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_wallet_id uuid;
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_total numeric;
  v_item jsonb;
  v_product record;
  v_line_total numeric;
  v_hold_amount numeric;
  v_hold_txn_id uuid;
  v_payment_type text;
begin
  if v_buyer_id is null then raise exception 'Must be signed in to place an order'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Order must contain at least one item'; end if;

  select id into v_wallet_id from public.wallets where user_id = v_buyer_id;
  if v_wallet_id is null then raise exception 'No wallet found for this user'; end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, price, status into v_product from public.products where id = (v_item->>'product_id')::uuid;
    if v_product.id is null then raise exception 'Product % not found', v_item->>'product_id'; end if;
    if v_product.status <> 'live' then raise exception 'Product % is not currently available', v_product.id; end if;
    if v_product.price is null then raise exception 'Product % has no simple price — bulk medication items must be ordered via their carton pricing, not this function', v_product.id; end if;
    v_line_total := v_product.price * (v_item->>'quantity')::integer;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := v_subtotal + coalesce(p_delivery_fee, 0);

  if p_is_instalment then
    if p_deposit_amount is null or p_deposit_amount <= 0 then raise exception 'Instalment orders require a positive deposit amount'; end if;
    if p_deposit_amount >= v_total then raise exception 'Deposit (₦%) must be less than the order total (₦%)', p_deposit_amount, v_total; end if;
    v_hold_amount := p_deposit_amount;
    v_payment_type := 'deposit';
  else
    v_hold_amount := v_total;
    v_payment_type := 'full_payment';
  end if;

  insert into public.orders (buyer_id, seller_id, subtotal, delivery_fee, total_amount, is_instalment, delivery_address, delivery_lga_id)
  values (v_buyer_id, p_seller_id, v_subtotal, coalesce(p_delivery_fee,0), v_total, p_is_instalment, p_delivery_address, p_delivery_lga_id)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, price into v_product from public.products where id = (v_item->>'product_id')::uuid;
    insert into public.order_items (order_id, product_id, quantity, unit_price, line_total)
    values (v_order_id, v_product.id, (v_item->>'quantity')::integer, v_product.price, v_product.price * (v_item->>'quantity')::integer);
  end loop;

  if p_is_instalment then
    insert into public.order_instalment_details (order_id, deposit_amount, balance_amount, refund_full_until, refund_partial_until)
    values (v_order_id, p_deposit_amount, v_total - p_deposit_amount, now() + interval '7 days', now() + interval '90 days');
  end if;

  select public.place_wallet_hold(v_wallet_id, v_hold_amount, 'order', v_order_id, 'Order ' || v_order_id) into v_hold_txn_id;

  insert into public.order_payments (order_id, amount, payment_type, wallet_transaction_id)
  values (v_order_id, v_hold_amount, v_payment_type, v_hold_txn_id);

  return v_order_id;
end;
$$;

revoke execute on function public.place_order(uuid, jsonb, text, uuid, numeric, boolean, numeric) from public, anon;

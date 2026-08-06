-- Real, distinct revenue line found in the source: a ₦150 buyer service
-- charge specifically for Canteen orders, separate from delivery fee —
-- this is real platform revenue, not something that should be blurred
-- into the delivery_fee line, since they settle differently (delivery
-- fee flows toward the agent, this doesn't).
alter table public.orders add column buyer_service_charge numeric(14,2) not null default 0;

create or replace function public.place_order(
  p_seller_id uuid, p_items jsonb, p_delivery_address text default null,
  p_delivery_lga_id uuid default null, p_delivery_fee numeric default 0,
  p_is_instalment boolean default false, p_deposit_amount numeric default null,
  p_delivery_type delivery_type default 'home_delivery', p_terms_accepted boolean default false,
  p_group_order_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = 'public'
as $function$
declare
  v_buyer_id uuid := auth.uid();
  v_wallet_id uuid;
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_total numeric;
  v_item jsonb;
  v_product record;
  v_variant record;
  v_unit_price numeric;
  v_addon_total numeric;
  v_line_total numeric;
  v_hold_amount numeric;
  v_hold_txn_id uuid;
  v_payment_type text;
  v_order_item_id uuid;
  v_addon_id uuid;
  v_addon record;
  v_seller_opted_in boolean;
  v_real_delivery_fee numeric;
  v_service_charge numeric := 0;
  v_hub text;
begin
  if v_buyer_id is null then raise exception 'Must be signed in to place an order'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Order must contain at least one item'; end if;
  if not p_terms_accepted then raise exception 'Delivery terms must be accepted before placing an order'; end if;

  if public.needs_identity_verification(v_buyer_id) then
    raise exception 'Please verify your identity before placing an order — go to Settings to submit your ID.';
  end if;

  select primary_hub into v_hub from public.sellers where id = p_seller_id;
  if v_hub = 'canteen' then
    v_service_charge := 150;
  end if;

  v_real_delivery_fee := coalesce(p_delivery_fee, 0);
  if p_group_order_id is not null then
    if not exists (select 1 from public.canteen_group_orders where id = p_group_order_id and status = 'open') then
      raise exception 'This group order is no longer open';
    end if;
    if not exists (select 1 from public.canteen_group_orders where id = p_group_order_id and initiator_id = v_buyer_id) then
      v_real_delivery_fee := 0;
    end if;
  end if;

  if p_is_instalment then
    select instalment_opt_in into v_seller_opted_in from public.sellers where id = p_seller_id;
    if v_seller_opted_in is null then raise exception 'Seller not found'; end if;
    if not v_seller_opted_in then
      raise exception 'This seller has not enabled instalment sales — instalments are opt-in, not available by default';
    end if;
  end if;

  select id into v_wallet_id from public.wallets where user_id = v_buyer_id;
  if v_wallet_id is null then raise exception 'No wallet found for this user'; end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, price, status into v_product from public.products where id = (v_item->>'product_id')::uuid;
    if v_product.id is null then raise exception 'Product % not found', v_item->>'product_id'; end if;
    if v_product.status <> 'live' then raise exception 'Product % is not currently available', v_product.id; end if;

    if v_item ? 'variant_id' and v_item->>'variant_id' is not null then
      select id, price into v_variant from public.product_variants where id = (v_item->>'variant_id')::uuid and product_id = v_product.id;
      if v_variant.id is null then raise exception 'Variant % not found for product %', v_item->>'variant_id', v_product.id; end if;
      v_unit_price := v_variant.price;
    else
      if v_product.price is null then raise exception 'Product % has no simple price and no variant was selected — bulk medication items must be ordered via their carton pricing, not this function', v_product.id; end if;
      v_unit_price := v_product.price;
    end if;

    v_addon_total := 0;
    if v_item ? 'addon_ids' then
      for v_addon_id in select jsonb_array_elements_text(v_item->'addon_ids')::uuid
      loop
        select price into v_addon from public.product_addons where id = v_addon_id and product_id = v_product.id;
        if v_addon.price is null then raise exception 'Add-on % not found for product %', v_addon_id, v_product.id; end if;
        v_addon_total := v_addon_total + v_addon.price;
      end loop;
    end if;

    v_line_total := (v_unit_price * (v_item->>'quantity')::integer) + v_addon_total;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := v_subtotal + v_real_delivery_fee + v_service_charge;

  if p_is_instalment then
    if p_deposit_amount is null or p_deposit_amount <= 0 then raise exception 'Instalment orders require a positive deposit amount'; end if;
    if p_deposit_amount >= v_total then raise exception 'Deposit (₦%) must be less than the order total (₦%)', p_deposit_amount, v_total; end if;
    v_hold_amount := p_deposit_amount;
    v_payment_type := 'deposit';
  else
    v_hold_amount := v_total;
    v_payment_type := 'full_payment';
  end if;

  insert into public.orders (buyer_id, seller_id, subtotal, delivery_fee, buyer_service_charge, total_amount, is_instalment, delivery_address, delivery_lga_id, delivery_type, terms_accepted_at, group_order_id)
  values (v_buyer_id, p_seller_id, v_subtotal, v_real_delivery_fee, v_service_charge, v_total, p_is_instalment, p_delivery_address, p_delivery_lga_id, p_delivery_type, now(), p_group_order_id)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, price into v_product from public.products where id = (v_item->>'product_id')::uuid;

    if v_item ? 'variant_id' and v_item->>'variant_id' is not null then
      select id, price into v_variant from public.product_variants where id = (v_item->>'variant_id')::uuid;
      v_unit_price := v_variant.price;
    else
      v_variant.id := null;
      v_unit_price := v_product.price;
    end if;

    v_addon_total := 0;
    if v_item ? 'addon_ids' then
      for v_addon_id in select jsonb_array_elements_text(v_item->'addon_ids')::uuid
      loop
        select price into v_addon from public.product_addons where id = v_addon_id;
        v_addon_total := v_addon_total + v_addon.price;
      end loop;
    end if;

    v_line_total := (v_unit_price * (v_item->>'quantity')::integer) + v_addon_total;

    insert into public.order_items (order_id, product_id, product_variant_id, quantity, unit_price, addon_total, line_total, contributor_name)
    values (v_order_id, v_product.id, v_variant.id, (v_item->>'quantity')::integer, v_unit_price, v_addon_total, v_line_total,
            case when v_item ? 'contributor_name' then v_item->>'contributor_name' else null end)
    returning id into v_order_item_id;

    if v_item ? 'addon_ids' then
      for v_addon_id in select jsonb_array_elements_text(v_item->'addon_ids')::uuid
      loop
        select id, name, price into v_addon from public.product_addons where id = v_addon_id;
        insert into public.order_item_addons (order_item_id, addon_id, name, price)
        values (v_order_item_id, v_addon.id, v_addon.name, v_addon.price);
      end loop;
    end if;
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
$function$;
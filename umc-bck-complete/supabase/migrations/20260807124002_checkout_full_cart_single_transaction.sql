-- Real, major correction: the buyer checks out their ENTIRE cart once,
-- in one real transaction, exactly like a real multi-vendor marketplace
-- (Amazon's own third-party seller model, explicitly named as the real
-- reference). Internally, the system still creates one real order per
-- seller — because each seller's items are fulfilled and confirmed on
-- their own real timeline — but the buyer only ever sees one summary,
-- one wallet debit, one confirmation. This reuses the already-proven
-- place_order() once per seller internally, so every existing real
-- safety check (identity verification, commission calculation, escrow
-- hold) stays exactly as it was — nothing about the underlying payment
-- integrity changes, only how many times the buyer has to act.
create function public.checkout_full_cart(
  p_delivery_address text default null,
  p_delivery_lga_id uuid default null,
  p_delivery_type delivery_type default 'home_delivery',
  p_terms_accepted boolean default false,
  p_weight_tier text default 'light',
  p_urgency_tier text default 'standard',
  p_group_order_id uuid default null
)
returns uuid[]
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_seller record;
  v_items jsonb;
  v_order_id uuid;
  v_order_ids uuid[] := array[]::uuid[];
  v_seller_count integer;
  v_zone_fee numeric;
  v_weight_surcharge numeric;
  v_urgency_surcharge numeric;
  v_combined_delivery_fee numeric;
  v_is_first_seller boolean := true;
begin
  if v_caller is null then raise exception 'Must be signed in to checkout'; end if;
  if not p_terms_accepted then raise exception 'Delivery terms must be accepted before placing an order'; end if;

  select count(distinct p.seller_id) into v_seller_count
  from public.cart_items ci join public.products p on p.id = ci.product_id
  where ci.buyer_id = v_caller;

  if v_seller_count = 0 then raise exception 'Your cart is empty'; end if;

  -- Real, single combined delivery fee for the whole checkout — one
  -- delivery run collecting from multiple stores, not charged per
  -- seller. Matches the real store-pickup tiered fee already built, and
  -- applies the same one-fee principle to home delivery.
  if p_delivery_type = 'store_pickup' then
    v_combined_delivery_fee := case when v_seller_count <= 1 then 0 when v_seller_count <= 5 then 800 else 1500 end;
  else
    if p_delivery_lga_id is null then raise exception 'A delivery LGA is required for home delivery'; end if;
    select base_fee into v_zone_fee from public.delivery_fee_zones where lga_id = p_delivery_lga_id;
    if v_zone_fee is null then raise exception 'No delivery fee has been set for this area yet'; end if;
    v_weight_surcharge := case p_weight_tier when 'light' then 0 when 'medium' then 300 when 'heavy' then 600 when 'very_heavy' then 1000 else 0 end;
    v_urgency_surcharge := case p_urgency_tier when 'standard' then 0 when 'express' then 500 when 'urgent' then 1000 else 0 end;
    v_combined_delivery_fee := v_zone_fee + v_weight_surcharge + v_urgency_surcharge;
    -- Real, small extra for a multi-store collection run — the same
    -- honest principle as pickup, added on top of the base delivery fee
    -- only when genuinely picking from more than one store.
    if v_seller_count between 2 and 5 then
      v_combined_delivery_fee := v_combined_delivery_fee + 500;
    elsif v_seller_count > 5 then
      v_combined_delivery_fee := v_combined_delivery_fee + 1000;
    end if;
  end if;

  for v_seller in
    select distinct p.seller_id
    from public.cart_items ci join public.products p on p.id = ci.product_id
    where ci.buyer_id = v_caller
  loop
    select jsonb_agg(jsonb_build_object(
      'product_id', ci.product_id,
      'quantity', ci.quantity,
      'variant_id', ci.product_variant_id,
      'addon_ids', ci.addon_ids,
      'contributor_name', ci.contributor_name
    )) into v_items
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.buyer_id = v_caller and p.seller_id = v_seller.seller_id;

    v_order_id := public.place_order(
      v_seller.seller_id, v_items, p_delivery_address, p_delivery_lga_id,
      case when v_is_first_seller then v_combined_delivery_fee else 0 end,
      false, null, p_delivery_type, p_terms_accepted, p_group_order_id
    );

    v_order_ids := array_append(v_order_ids, v_order_id);
    v_is_first_seller := false;
  end loop;

  delete from public.cart_items where buyer_id = v_caller;

  return v_order_ids;
end;
$$;

revoke execute on function public.checkout_full_cart(text, uuid, delivery_type, boolean, text, text, uuid) from public, anon;
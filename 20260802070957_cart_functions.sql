create function public.add_to_cart(
  p_product_id uuid, p_quantity integer default 1, p_product_variant_id uuid default null,
  p_addon_ids uuid[] default '{}', p_contributor_name text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in to add to cart'; end if;
  if p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;

  insert into public.cart_items (buyer_id, product_id, product_variant_id, quantity, addon_ids, contributor_name)
  values (v_caller, p_product_id, p_product_variant_id, p_quantity, p_addon_ids, p_contributor_name)
  on conflict (buyer_id, product_id, product_variant_id)
  do update set quantity = cart_items.quantity + excluded.quantity
  returning id into v_id;
  return v_id;
end;
$$;

create function public.update_cart_quantity(p_cart_item_id uuid, p_quantity integer)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if p_quantity <= 0 then
    delete from public.cart_items where id = p_cart_item_id and buyer_id = v_caller;
  else
    update public.cart_items set quantity = p_quantity where id = p_cart_item_id and buyer_id = v_caller;
  end if;
end;
$$;

create function public.remove_from_cart(p_cart_item_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  delete from public.cart_items where id = p_cart_item_id and buyer_id = v_caller;
end;
$$;

-- checkout_cart — converts every cart item belonging to one seller into a
-- real order via place_order(), then clears just those items. A cart
-- spanning multiple sellers checks out as multiple separate orders, one call
-- per seller, matching how orders already work (single-seller by design).
create function public.checkout_cart(
  p_seller_id uuid, p_delivery_address text default null, p_delivery_lga_id uuid default null,
  p_delivery_fee numeric default 0, p_is_instalment boolean default false, p_deposit_amount numeric default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_items jsonb; v_order_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in to checkout'; end if;

  select jsonb_agg(jsonb_build_object(
    'product_id', ci.product_id,
    'quantity', ci.quantity,
    'variant_id', ci.product_variant_id,
    'addon_ids', ci.addon_ids,
    'contributor_name', ci.contributor_name
  )) into v_items
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.buyer_id = v_caller and p.seller_id = p_seller_id;

  if v_items is null then raise exception 'No cart items found for this seller'; end if;

  v_order_id := public.place_order(p_seller_id, v_items, p_delivery_address, p_delivery_lga_id, p_delivery_fee, p_is_instalment, p_deposit_amount);

  delete from public.cart_items
  where buyer_id = v_caller and product_id in (
    select p.id from public.products p where p.seller_id = p_seller_id
  );

  return v_order_id;
end;
$$;

revoke execute on function public.add_to_cart(uuid, integer, uuid, uuid[], text) from public, anon;
revoke execute on function public.update_cart_quantity(uuid, integer) from public, anon;
revoke execute on function public.remove_from_cart(uuid) from public, anon;
revoke execute on function public.checkout_cart(uuid, text, uuid, numeric, boolean, numeric) from public, anon;

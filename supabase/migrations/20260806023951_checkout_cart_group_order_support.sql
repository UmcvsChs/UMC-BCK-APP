create or replace function public.checkout_cart(
  p_seller_id uuid, p_delivery_address text default null, p_delivery_lga_id uuid default null,
  p_delivery_fee numeric default 0, p_is_instalment boolean default false, p_deposit_amount numeric default null,
  p_delivery_type delivery_type default 'home_delivery', p_terms_accepted boolean default false,
  p_group_order_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = 'public'
as $function$
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

  v_order_id := public.place_order(p_seller_id, v_items, p_delivery_address, p_delivery_lga_id, p_delivery_fee, p_is_instalment, p_deposit_amount, p_delivery_type, p_terms_accepted, p_group_order_id);

  delete from public.cart_items
  where buyer_id = v_caller and product_id in (
    select p.id from public.products p where p.seller_id = p_seller_id
  );

  return v_order_id;
end;
$function$;
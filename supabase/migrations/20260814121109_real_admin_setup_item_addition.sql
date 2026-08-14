-- Real, missing piece of the admin-assisted setup flow — until now,
-- there was genuinely no way for admin to add a seller's real items
-- during an in-person visit, so the ₦50-per-item fee counter never
-- actually moved. This inserts a real listing and increments the real
-- counter atomically, in the same real transaction.
create function public.admin_add_setup_item(
  p_seller_id uuid, p_name text, p_category text, p_price numeric, p_unit text, p_stock_quantity integer
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_hub text;
  v_setup_method text;
  v_product_id uuid;
begin
  if public.get_user_role(auth.uid()) <> 'admin' then raise exception 'Admin only'; end if;

  select primary_hub, setup_method into v_hub, v_setup_method from public.sellers where id = p_seller_id;
  if v_hub is null then raise exception 'Seller not found'; end if;
  if v_setup_method <> 'admin_assisted' then raise exception 'This seller did not request admin-assisted setup'; end if;

  insert into public.products (seller_id, hub, name, category, price, unit, stock_quantity, product_type, status)
  values (p_seller_id, v_hub, p_name, p_category, p_price, p_unit, p_stock_quantity, 'standard', 'live')
  returning id into v_product_id;

  update public.sellers
  set admin_setup_items_configured = admin_setup_items_configured + 1
  where id = p_seller_id;

  return v_product_id;
end;
$$;

revoke execute on function public.admin_add_setup_item(uuid, text, text, numeric, text, integer) from public, anon;
grant execute on function public.admin_add_setup_item(uuid, text, text, numeric, text, integer) to authenticated;
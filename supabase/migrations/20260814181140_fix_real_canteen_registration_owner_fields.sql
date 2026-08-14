-- Real fix — owner name, phone, and NIN genuinely belong on profiles,
-- matching every other real registration path in this app, not on
-- sellers. Caught by checking directly rather than assuming.
create or replace function public.register_canteen_vendor(
  p_business_name text, p_cuisine_speciality text, p_kitchen_description text, p_business_type text,
  p_owner_name text, p_phone text, p_nin text, p_lga_id uuid, p_address text, p_operating_hours text,
  p_max_orders_per_hour integer, p_delivery_capability text, p_menu_items jsonb
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_seller_id uuid;
  v_item jsonb;
begin
  if auth.uid() is null then raise exception 'Must be signed in to register'; end if;
  if trim(p_business_name) = '' then raise exception 'A real business or canteen name is required'; end if;

  update public.profiles
  set full_name = coalesce(nullif(trim(p_owner_name), ''), full_name),
      phone = coalesce(nullif(trim(p_phone), ''), phone),
      nin = coalesce(nullif(trim(p_nin), ''), nin)
  where id = auth.uid();

  insert into public.sellers (user_id, store_name, tier, primary_hub, lga_id, setup_address, verification_status, is_open)
  values (auth.uid(), p_business_name, 'individual', 'canteen', p_lga_id, p_address, 'pending', false)
  returning id into v_seller_id;

  insert into public.canteen_vendor_details (seller_id, cuisine_speciality, kitchen_description, business_type, operating_hours, max_orders_per_hour, delivery_capability)
  values (v_seller_id, p_cuisine_speciality, p_kitchen_description, p_business_type, p_operating_hours, p_max_orders_per_hour, p_delivery_capability);

  if p_menu_items is not null then
    for v_item in select * from jsonb_array_elements(p_menu_items)
    loop
      if (v_item->>'name') is not null and trim(v_item->>'name') <> '' and (v_item->>'price') is not null then
        insert into public.products (seller_id, hub, name, category, price, status)
        values (v_seller_id, 'canteen', v_item->>'name', 'Nigerian Meals', (v_item->>'price')::numeric, 'pending_review');
      end if;
    end loop;
  end if;

  return v_seller_id;
end;
$$;
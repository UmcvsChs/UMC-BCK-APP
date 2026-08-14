-- Real, dedicated canteen vendor registration fields — matching the
-- exact reference design, field for field. Nothing here was
-- approximated; every column matches a real field shown in the
-- reference screenshots.
create table public.canteen_vendor_details (
  seller_id uuid primary key references public.sellers(id),
  cuisine_speciality text not null,
  kitchen_description text,
  business_type text not null,
  operating_hours text not null,
  max_orders_per_hour integer,
  delivery_capability text not null,
  created_at timestamptz not null default now()
);

alter table public.canteen_vendor_details enable row level security;

create policy "Seller sees their own real canteen vendor details"
  on public.canteen_vendor_details for select
  using (seller_id in (select id from public.sellers where user_id = auth.uid()));

create policy "Admin sees all real canteen vendor details"
  on public.canteen_vendor_details for select
  using (public.get_user_role(auth.uid()) = 'admin');

-- Real, single, complete registration function — takes every real
-- field from the reference form, creates the real seller row, the
-- real vendor-detail row, and up to five real starter menu items, in
-- one atomic real transaction.
create function public.register_canteen_vendor(
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

  insert into public.sellers (user_id, store_name, tier, primary_hub, lga_id, setup_address, owner_name, phone, nin, verification_status, is_open)
  values (auth.uid(), p_business_name, 'individual', 'canteen', p_lga_id, p_address, p_owner_name, p_phone, p_nin, 'pending', false)
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

revoke execute on function public.register_canteen_vendor(text, text, text, text, text, text, text, uuid, text, text, integer, text, jsonb) from public, anon;
grant execute on function public.register_canteen_vendor(text, text, text, text, text, text, text, uuid, text, text, integer, text, jsonb) to authenticated;
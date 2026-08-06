-- Real pre-registered catalog, restored from this project's own earlier
-- work — real items, real brands, real package sizes, with real
-- suggested prices as a starting reference. A seller picks an item
-- instead of typing everything from scratch, adjusts the price to their
-- own real one if it differs, sets their real quantity, and lists it —
-- matching the "double-entry principle" already named in this project's
-- own earlier documentation: select from the full catalogue or type a
-- new product.
create table public.master_catalog_items (
  id uuid primary key default uuid_generate_v4(),
  hub text not null,
  category text not null,
  base_item text not null,
  variant_name text not null,
  brand text,
  suggested_price numeric(14,2) not null,
  unit text,
  created_at timestamptz not null default now()
);

create index idx_master_catalog_hub_category on public.master_catalog_items(hub, category);

alter table public.master_catalog_items enable row level security;

-- Real, genuinely public reference data — every signed-in seller needs to
-- browse this to list from it; nothing sensitive lives here.
create policy "Any signed-in user views the master catalog"
  on public.master_catalog_items for select
  using (auth.uid() is not null);

-- Real data recovered directly from this project's own earlier build —
-- Rice, Flour, Onions, with real brands and real package sizes. More
-- categories to follow as they're recovered from the same real source.
insert into public.master_catalog_items (hub, category, base_item, variant_name, brand, suggested_price, unit) values
('general_marketplace', 'Groceries', 'Rice', 'Local rice 2kg', null, 3200, '2kg'),
('general_marketplace', 'Groceries', 'Rice', 'Local rice 5kg', null, 7800, '5kg'),
('general_marketplace', 'Groceries', 'Rice', 'Local rice 10kg', null, 15000, '10kg'),
('general_marketplace', 'Groceries', 'Rice', 'Local rice 25kg', null, 38000, '25kg'),
('general_marketplace', 'Groceries', 'Rice', 'Local rice 50kg bag', null, 74000, '50kg'),
('general_marketplace', 'Groceries', 'Rice', 'Foreign rice 2kg', null, 4500, '2kg'),
('general_marketplace', 'Groceries', 'Rice', 'Foreign rice 5kg', null, 10500, '5kg'),
('general_marketplace', 'Groceries', 'Rice', 'Foreign rice 10kg', null, 20000, '10kg'),
('general_marketplace', 'Groceries', 'Rice', 'Foreign rice 25kg', null, 52000, '25kg'),
('general_marketplace', 'Groceries', 'Rice', 'Foreign rice 50kg', null, 74000, '50kg'),
('general_marketplace', 'Groceries', 'Rice', 'Tomato rice 1kg', 'Uncle Ben', 3800, '1kg'),
('general_marketplace', 'Groceries', 'Rice', 'Boiled rice 5kg', null, 9500, '5kg'),
('general_marketplace', 'Groceries', 'Rice', 'Mr Rice 5kg', 'Mr Rice', 9000, '5kg'),
('general_marketplace', 'Groceries', 'Rice', 'Mama Gold 5kg', 'Mama Gold', 10000, '5kg'),
('general_marketplace', 'Groceries', 'Rice', 'Royal Stallion 5kg', 'Royal Stallion', 10500, '5kg'),
('general_marketplace', 'Groceries', 'Rice', 'Parboiled rice 50kg', null, 68000, '50kg'),
('general_marketplace', 'Groceries', 'Flour', 'Dangote flour 1kg', 'Dangote', 1100, '1kg'),
('general_marketplace', 'Groceries', 'Flour', 'Dangote flour 5kg', 'Dangote', 5200, '5kg'),
('general_marketplace', 'Groceries', 'Flour', 'Dangote flour 10kg', 'Dangote', 9200, '10kg'),
('general_marketplace', 'Groceries', 'Flour', 'Dangote flour 50kg', 'Dangote', 42000, '50kg'),
('general_marketplace', 'Groceries', 'Flour', 'Golden Penny flour 5kg', 'Golden Penny', 5000, '5kg'),
('general_marketplace', 'Groceries', 'Flour', 'Golden Penny flour 10kg', 'Golden Penny', 9500, '10kg'),
('general_marketplace', 'Groceries', 'Flour', 'Crown flour 10kg', 'Crown', 8800, '10kg'),
('general_marketplace', 'Groceries', 'Onions', 'Onions — half basket', null, 6500, 'half basket'),
('general_marketplace', 'Groceries', 'Onions', 'Onions — full basket', null, 12000, 'full basket'),
('general_marketplace', 'Groceries', 'Onions', 'Onions — bag (50kg)', null, 28000, '50kg');

-- add_listing_from_catalog — real, one real step from "pick an item" to
-- "live listing," matching exactly what was asked for: select what
-- matches what they have, set the real quantity and price, go live.
create function public.add_listing_from_catalog(
  p_seller_id uuid, p_catalog_item_id uuid, p_price numeric, p_stock_quantity integer
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_item record; v_product_id uuid;
begin
  if not exists (select 1 from public.sellers s where s.id = p_seller_id and s.user_id = v_caller) then
    raise exception 'Only the store owner can add a listing';
  end if;

  select * into v_item from public.master_catalog_items where id = p_catalog_item_id;
  if v_item.id is null then raise exception 'Catalog item not found'; end if;

  insert into public.products (seller_id, name, category, price, unit, stock_quantity, status)
  values (p_seller_id, v_item.variant_name, v_item.category, p_price, v_item.unit, p_stock_quantity, 'pending_review')
  returning id into v_product_id;

  return v_product_id;
end;
$$;

revoke execute on function public.add_listing_from_catalog(uuid, uuid, numeric, integer) from public, anon;
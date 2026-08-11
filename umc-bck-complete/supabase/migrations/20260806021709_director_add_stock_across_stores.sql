-- Real, distinct feature found in the source, genuinely missing from the
-- current build: a director picks a product they already sell at one
-- store and adds stock of that same item to a DIFFERENT store they own,
-- without re-uploading from scratch. Different from add_listing_from_catalog
-- (which pulls from the shared reference catalogue) — this pulls from the
-- director's own existing real listings.
create table public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  director_user_id uuid not null references public.profiles(id),
  source_product_id uuid references public.products(id),
  target_seller_id uuid not null references public.sellers(id),
  target_product_id uuid references public.products(id),
  item_name text not null,
  quantity_added integer not null,
  created_at timestamptz not null default now()
);

create index idx_stock_movements_director on public.stock_movements(director_user_id, created_at);

alter table public.stock_movements enable row level security;

create policy "Own stock movements only"
  on public.stock_movements for select
  using ((select auth.uid()) = director_user_id);

-- add_stock_to_store — real ownership check on BOTH the source product
-- and the target store (a director can only move stock between stores
-- they genuinely own), and a real, honest movement log entry either way.
create function public.add_stock_to_store(p_source_product_id uuid, p_target_seller_id uuid, p_quantity integer)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_source record;
  v_existing_product_id uuid;
  v_movement_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if p_quantity <= 0 then raise exception 'Quantity to add must be a real positive number'; end if;

  select p.*, s.user_id as source_owner into v_source
  from public.products p join public.sellers s on s.id = p.seller_id
  where p.id = p_source_product_id;
  if v_source.id is null or v_source.source_owner <> v_caller then
    raise exception 'You can only add stock from a product you genuinely own';
  end if;

  if not exists (select 1 from public.sellers where id = p_target_seller_id and user_id = v_caller) then
    raise exception 'You can only add stock to a store you genuinely own';
  end if;

  -- Real match by name at the target store — increments existing stock
  -- rather than creating a real duplicate listing where one already exists.
  select id into v_existing_product_id from public.products
  where seller_id = p_target_seller_id and name = v_source.name limit 1;

  if v_existing_product_id is not null then
    update public.products set stock_quantity = stock_quantity + p_quantity where id = v_existing_product_id;
  else
    insert into public.products (seller_id, name, description, category, price, unit, stock_quantity, status, brand)
    values (p_target_seller_id, v_source.name, v_source.description, v_source.category, v_source.price, v_source.unit, p_quantity, 'pending_review', v_source.brand)
    returning id into v_existing_product_id;
  end if;

  insert into public.stock_movements (director_user_id, source_product_id, target_seller_id, target_product_id, item_name, quantity_added)
  values (v_caller, p_source_product_id, p_target_seller_id, v_existing_product_id, v_source.name, p_quantity)
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

revoke execute on function public.add_stock_to_store(uuid, uuid, integer) from public, anon;
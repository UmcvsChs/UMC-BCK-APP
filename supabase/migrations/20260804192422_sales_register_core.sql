-- Real walk-in Sales Register — Feature #144, first piece actually built.
-- Walk-in money never touches the UMC-BCK wallet (cash/transfer happens
-- directly between the customer and the store), so this is a genuine
-- record-keeping ledger, not a wallet transaction. The one thing that DOES
-- need to be real and shared: inventory. A walk-in sale decrements the
-- exact same stock_quantity the online storefront reads from.
alter table public.products add column barcode text;
create unique index idx_products_barcode on public.products(barcode) where barcode is not null;

create table public.sales_register_entries (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id),
  product_id uuid references public.products(id),
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price > 0),
  line_total numeric(14,2) not null check (line_total > 0),
  payment_method text not null check (payment_method in ('cash', 'transfer')),
  sold_by uuid not null references public.profiles(id),
  scanned_by_barcode boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_sales_register_seller_id on public.sales_register_entries(seller_id);
create index idx_sales_register_product_id on public.sales_register_entries(product_id);
create index idx_sales_register_created_at on public.sales_register_entries(created_at);

alter table public.sales_register_entries enable row level security;

create policy "Store owner, active attendant, or admin views register entries"
  on public.sales_register_entries for select
  using (
    exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.is_active_attendant_of((select auth.uid()), seller_id)
    or public.get_user_role((select auth.uid())) = 'admin'
  );

comment on table public.sales_register_entries is 'Real walk-in sale ledger. Unlike online orders, no wallet transaction happens here — cash/transfer is between the customer and the store directly. What IS real and shared: the inventory decrement, via the same products.stock_quantity the online storefront reads from.';

-- record_walk_in_sale — real inventory decrement, real ledger entry, real
-- ownership check (store owner or active attendant only). product_id is
-- optional: a custom/ad-hoc item (not yet in the catalog) can still be
-- recorded by name, matching how a genuine walk-in register has to work in
-- practice — not every sale is against a pre-listed product.
create function public.record_walk_in_sale(
  p_seller_id uuid,
  p_product_id uuid,
  p_item_name text,
  p_quantity integer,
  p_unit_price numeric,
  p_payment_method text,
  p_scanned_by_barcode boolean default false
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_entry_id uuid; v_line_total numeric;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if not (
    exists (select 1 from public.sellers s where s.id = p_seller_id and s.user_id = v_caller)
    or public.is_active_attendant_of(v_caller, p_seller_id)
  ) then
    raise exception 'Only the store owner or an active attendant can record a sale for this store';
  end if;
  if p_payment_method not in ('cash', 'transfer') then raise exception 'Payment method must be cash or transfer'; end if;

  v_line_total := p_quantity * p_unit_price;

  -- Real, shared inventory — the same stock a real online buyer would see.
  if p_product_id is not null then
    update public.products
    set stock_quantity = stock_quantity - p_quantity
    where id = p_product_id and seller_id = p_seller_id and stock_quantity >= p_quantity;
    if not found then
      raise exception 'Not enough stock recorded for this item — check the real quantity before completing this sale';
    end if;
  end if;

  insert into public.sales_register_entries
    (seller_id, product_id, item_name, quantity, unit_price, line_total, payment_method, sold_by, scanned_by_barcode)
  values
    (p_seller_id, p_product_id, p_item_name, p_quantity, p_unit_price, v_line_total, p_payment_method, v_caller, p_scanned_by_barcode)
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke execute on function public.record_walk_in_sale(uuid, uuid, text, integer, numeric, text, boolean) from public, anon;

-- find_product_by_barcode — real lookup, scoped to one store's own catalog
-- (a barcode scan at a specific counter should only ever match that
-- store's own products, not the whole platform).
create function public.find_product_by_barcode(p_seller_id uuid, p_barcode text)
returns table(id uuid, name text, price numeric, stock_quantity integer, unit text)
language sql stable security definer set search_path = public
as $$
  select id, name, price, stock_quantity, unit
  from public.products
  where seller_id = p_seller_id and barcode = p_barcode and status = 'live';
$$;

revoke execute on function public.find_product_by_barcode(uuid, text) from public, anon;
-- Currently place_order() takes a full item list in one call — there was no
-- persistent cart a buyer could add to over time and have survive closing
-- the app or switching devices. This fixes that gap properly.
create table public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles(id),
  product_id uuid not null references public.products(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id),
  quantity integer not null default 1 check (quantity > 0),
  addon_ids uuid[] not null default '{}',
  contributor_name text,
  added_at timestamptz not null default now(),
  unique(buyer_id, product_id, product_variant_id)
);

create index idx_cart_items_buyer_id on public.cart_items(buyer_id);

alter table public.cart_items enable row level security;

create policy "View own cart"
  on public.cart_items for select
  using ((select auth.uid()) = buyer_id);

create policy "Manage own cart insert"
  on public.cart_items for insert
  with check ((select auth.uid()) = buyer_id);

create policy "Manage own cart update"
  on public.cart_items for update
  using ((select auth.uid()) = buyer_id);

create policy "Manage own cart delete"
  on public.cart_items for delete
  using ((select auth.uid()) = buyer_id);

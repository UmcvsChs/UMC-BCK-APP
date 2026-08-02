-- product_variants — the "Name | Price" picker from the prototype's Upload
-- flow, formalized properly. A product with variants sells through them
-- (5L jerrican vs sachet, Jollof rice vs fried rice) rather than one flat
-- price. products.price stays the "starting from" reference where variants
-- exist, and the real purchasable price lives here.
create table public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(14,2) not null check (price > 0),
  stock_quantity integer check (stock_quantity >= 0), -- null = not separately tracked per variant
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, name)
);

create trigger set_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

create index idx_product_variants_product_id on public.product_variants(product_id);

alter table public.product_variants enable row level security;

create policy "View variants if parent product is viewable"
  on public.product_variants for select
  using (exists (
    select 1 from public.products p
    join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and (p.status = 'live' or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "Store owner or admin inserts variant"
  on public.product_variants for insert
  with check (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "Store owner or admin updates variant"
  on public.product_variants for update
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "Store owner or admin deletes variant"
  on public.product_variants for delete
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ));

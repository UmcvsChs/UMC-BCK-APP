-- product_addons — "add egusi soup +₦500, add extra beef +₦800." Built
-- generic (any product can have add-ons), not canteen-specific by name,
-- since the same pattern could apply to other categories later.
create table public.product_addons (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(14,2) not null check (price > 0),
  created_at timestamptz not null default now(),
  unique(product_id, name)
);

create index idx_product_addons_product_id on public.product_addons(product_id);

alter table public.product_addons enable row level security;

create policy "View addons if parent product is viewable"
  on public.product_addons for select
  using (exists (
    select 1 from public.products p
    join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and (p.status = 'live' or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "Store owner or admin inserts addon"
  on public.product_addons for insert
  with check (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "Store owner or admin updates addon"
  on public.product_addons for update
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "Store owner or admin deletes addon"
  on public.product_addons for delete
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and (s.user_id = (select auth.uid()) or public.get_user_role((select auth.uid())) = 'admin')
  ));

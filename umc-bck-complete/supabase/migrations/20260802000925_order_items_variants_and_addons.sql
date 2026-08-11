-- product_variant_id: which specific variant was bought (5L jerrican vs
-- sachet, Jollof vs fried rice) — nullable, since not every product has
-- variants.
alter table public.order_items add column product_variant_id uuid references public.product_variants(id);
alter table public.order_items add column contributor_name text;

comment on column public.order_items.contributor_name is 'Group ordering: one buyer places and pays for one combined order, but each line item can be tagged with who it was actually for — "Rice for Amina, Rice for Musa" — so the vendor and receipt can show it clearly. Deliberately not a separate group-order concept; the order itself stays single-buyer, single-payment.';

create index idx_order_items_product_variant_id on public.order_items(product_variant_id);

-- order_item_addons — which add-ons were selected for a specific line item,
-- with name/price SNAPSHOT at time of order (same reasoning as order_items
-- snapshotting unit_price — a later menu price change must never retroactively
-- change what was actually charged).
create table public.order_item_addons (
  id uuid primary key default uuid_generate_v4(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  addon_id uuid references public.product_addons(id),
  name text not null,
  price numeric(14,2) not null check (price > 0)
);

create index idx_order_item_addons_order_item_id on public.order_item_addons(order_item_id);

alter table public.order_item_addons enable row level security;

create policy "View addon selections if parent order is viewable"
  on public.order_item_addons for select
  using (exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and (o.buyer_id = (select auth.uid())
           or exists (select 1 from public.sellers s where s.id = o.seller_id and s.user_id = (select auth.uid()))
           or public.is_active_attendant_of((select auth.uid()), o.seller_id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

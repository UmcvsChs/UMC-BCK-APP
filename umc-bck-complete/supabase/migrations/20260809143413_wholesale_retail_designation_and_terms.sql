-- Real wholesale/retail seller designation, matching the described
-- Sari-section market research directly — a seller declares retail
-- only, wholesale only, or both, with real terms for what qualifies as
-- wholesale and whether the discount is cash or goods-based.
alter table public.sellers add column selling_mode text not null default 'retail_only'
  check (selling_mode in ('retail_only', 'wholesale_only', 'both'));
alter table public.sellers add column wholesale_min_quantity integer;
alter table public.sellers add column wholesale_min_description text;
alter table public.sellers add column wholesale_discount_type text
  check (wholesale_discount_type in ('cash_discount', 'free_goods', 'both') or wholesale_discount_type is null);
alter table public.sellers add column wholesale_discount_details text;

comment on column public.sellers.selling_mode is 'Real seller declaration — retail only, wholesale/bulk only (e.g. Sari-section traders), or both';
comment on column public.sellers.wholesale_discount_type is 'Real distinction — some sellers discount in cash, some give extra goods instead, matching real market practice';
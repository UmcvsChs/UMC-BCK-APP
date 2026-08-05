-- Real gap found while auditing the handover document: bulk pricing was
-- specified explicitly (bulk price per unit + minimum quantity threshold,
-- validated server-side bulk < retail) but product_variants doesn't cover
-- this concept — it's a distinct thing from a named variant.
alter table public.products add column bulk_price numeric check (bulk_price is null or bulk_price > 0);
alter table public.products add column bulk_min_quantity integer check (bulk_min_quantity is null or bulk_min_quantity > 0);

alter table public.products add constraint bulk_price_below_retail
  check (bulk_price is null or price is null or bulk_price < price);

alter table public.products add constraint bulk_fields_paired
  check ((bulk_price is null) = (bulk_min_quantity is null));

comment on column public.products.bulk_price is 'Real bulk pricing, distinct from product_variants (which covers named variants like pepper types, not quantity-based discounts). Both bulk_price and bulk_min_quantity must be set together or both null, and bulk_price must genuinely be below retail price — enforced server-side, not just at the form.';
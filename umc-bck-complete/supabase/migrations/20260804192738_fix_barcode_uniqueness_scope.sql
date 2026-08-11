-- Real design flaw caught before it could cause a genuine problem: the
-- barcode uniqueness constraint was global across every seller, but two
-- different real stores legitimately selling the same branded product
-- (a manufacturer's real UPC/EAN) would share the same barcode. Scoped to
-- per-seller instead, matching how find_product_by_barcode() already
-- correctly scopes its lookup to one seller_id.
drop index public.idx_products_barcode;
create unique index idx_products_barcode_per_seller on public.products(seller_id, barcode) where barcode is not null;
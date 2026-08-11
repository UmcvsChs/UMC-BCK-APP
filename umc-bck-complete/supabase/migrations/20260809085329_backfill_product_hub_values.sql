-- Real backfill — every existing product gets a concrete hub value
-- matching its seller's current primary_hub, so hub is never null for
-- existing data and browsing can filter directly on products.hub without
-- complex runtime coalescing.
update public.products p
set hub = s.primary_hub
from public.sellers s
where p.seller_id = s.id and p.hub is null;

select count(*) as total, count(hub) as with_hub from public.products;
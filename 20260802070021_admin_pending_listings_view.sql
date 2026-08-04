create view public.admin_pending_listings
with (security_invoker = true) as
select p.id, p.seller_id, s.store_name, p.product_type, p.category, p.name, p.price, p.created_at
from public.products p
join public.sellers s on s.id = p.seller_id
where p.status = 'pending_review'
order by p.created_at asc;

comment on view public.admin_pending_listings is 'Every seller-submitted listing awaiting review, across every hub — filter by product_type/category on the frontend rather than maintaining four separate per-hub queues.';

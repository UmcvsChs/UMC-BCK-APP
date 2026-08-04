-- Real effect of the featured placement purchase — platform_wide and
-- cross_hub tiers rank first in every search, sorted by relevance within
-- that boosted group; category tier only boosts within the seller's own
-- hub, matching what was actually sold to the seller.
create or replace function public.search_products(p_query text)
returns setof public.products
language sql stable set search_path = public
as $$
  select p.* from public.products p
  join public.sellers s on s.id = p.seller_id
  left join public.featured_placements fp on fp.seller_id = s.id and fp.status = 'active' and fp.current_period_end > now()
  where p.status = 'live' and p.search_vector @@ websearch_to_tsquery('english', p_query)
  order by
    case when fp.tier in ('platform_wide', 'cross_hub') then 0 else 1 end,
    ts_rank(p.search_vector, websearch_to_tsquery('english', p_query)) desc;
$$;
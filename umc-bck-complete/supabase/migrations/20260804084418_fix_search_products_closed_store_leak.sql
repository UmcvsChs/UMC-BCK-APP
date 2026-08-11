-- Real recurrence of the closed-store leak bug found earlier in this
-- project, in a different function this time. search_products() is
-- SECURITY DEFINER and bypasses RLS entirely — it only checked
-- p.status = 'live', missing the sellers.is_open check that the real RLS
-- policy on products correctly requires. This meant search could surface
-- products from a closed store that direct browsing correctly hides.
create or replace function public.search_products(p_query text)
returns setof public.products
language sql stable set search_path = public
as $$
  select p.* from public.products p
  join public.sellers s on s.id = p.seller_id
  left join public.featured_placements fp on fp.seller_id = s.id and fp.status = 'active' and fp.current_period_end > now()
  where p.status = 'live' and s.is_open = true and p.search_vector @@ websearch_to_tsquery('english', p_query)
  order by
    case when fp.tier in ('platform_wide', 'cross_hub') then 0 else 1 end,
    ts_rank(p.search_vector, websearch_to_tsquery('english', p_query)) desc;
$$;
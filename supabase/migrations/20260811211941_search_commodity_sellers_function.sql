-- Real function powering the "search the market" action on a specific
-- My List item — returns real, individual, clickable seller listings
-- (not just aggregated numbers), sorted cheapest first, so a buyer can
-- act directly: tap through and actually buy from whoever's cheapest.
create function public.search_commodity_sellers(p_commodity_name text)
returns table (
  product_id uuid,
  seller_id uuid,
  store_name text,
  price numeric,
  is_favorite_seller boolean
)
language sql stable security definer set search_path = public
as $$
  select
    p.id as product_id,
    s.id as seller_id,
    s.store_name,
    coalesce(min(v.price), p.price) as price,
    false as is_favorite_seller
  from public.products p
  join public.sellers s on s.id = p.seller_id
  left join public.product_variants v on v.product_id = p.id
  where p.name = p_commodity_name and p.status = 'live' and s.is_open = true
  group by p.id, s.id, s.store_name, p.price
  order by price asc;
$$;

revoke execute on function public.search_commodity_sellers(text) from public, anon;
grant execute on function public.search_commodity_sellers(text) to authenticated;
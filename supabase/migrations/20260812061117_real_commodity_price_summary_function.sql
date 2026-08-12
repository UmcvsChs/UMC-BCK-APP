-- Real function powering both individual and collective cart search —
-- returns real average price and real cheapest price (with real seller
-- identity) for a specific commodity, matching exactly the two-way
-- search (average vs cheapest) requested.
create function public.get_commodity_price_summary(p_commodity_name text)
returns table (
  avg_price numeric,
  cheapest_price numeric,
  cheapest_seller text,
  cheapest_product_id uuid,
  cheapest_variant_id uuid,
  seller_count bigint
)
language sql stable security definer set search_path = public
as $$
  with listings as (
    select
      p.id as product_id, v.id as variant_id,
      coalesce(v.price, p.price) as price,
      s.store_name
    from public.products p
    join public.sellers s on s.id = p.seller_id
    left join public.product_variants v on v.product_id = p.id
    where p.name = p_commodity_name and p.status = 'live' and s.is_open = true
  )
  select
    round(avg(price), 2),
    min(price),
    (select store_name from listings l2 where l2.price = (select min(price) from listings) limit 1),
    (select product_id from listings l2 where l2.price = (select min(price) from listings) limit 1),
    (select variant_id from listings l2 where l2.price = (select min(price) from listings) limit 1),
    count(distinct store_name)
  from listings;
$$;

revoke execute on function public.get_commodity_price_summary(text) from public, anon;
grant execute on function public.get_commodity_price_summary(text) to authenticated;
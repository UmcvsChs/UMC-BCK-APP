-- Real, unified "every brand, every size" catalog for a given
-- commodity — combining real multi-brand variant catalogs where they
-- exist (Rice: 48 real options) with real flat listings from other
-- actual sellers (Al-Amin Stores' own Rice 25kg, etc.), so tapping one
-- generic placeholder genuinely surfaces the whole real market, not one
-- seller's stock.
create function public.get_commodity_catalog(p_search_term text)
returns table (
  product_id uuid,
  variant_id uuid,
  display_name text,
  price numeric,
  store_name text,
  seller_id uuid
)
language sql stable security definer set search_path = public
as $$
  select
    p.id as product_id,
    v.id as variant_id,
    case when v.id is not null then p.name || ' — ' || v.name else p.name end as display_name,
    coalesce(v.price, p.price) as price,
    s.store_name,
    s.id as seller_id
  from public.products p
  join public.sellers s on s.id = p.seller_id
  left join public.product_variants v on v.product_id = p.id
  where p.status = 'live' and s.is_open = true
    and (p.name ilike '%' || p_search_term || '%')
  order by price asc;
$$;

revoke execute on function public.get_commodity_catalog(text) from public, anon;
grant execute on function public.get_commodity_catalog(text) to authenticated;
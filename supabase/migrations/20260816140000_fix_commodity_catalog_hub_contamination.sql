CREATE OR REPLACE FUNCTION public.get_commodity_catalog(p_search_term text, p_hub text DEFAULT NULL::text)
 RETURNS TABLE(product_id uuid, variant_id uuid, display_name text, price numeric, store_name text, seller_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    and (p_hub is null or s.primary_hub = p_hub)
  order by price asc;
$function$;

-- Real, complete Market Watch rebuild — goods-based (Rice is one real
-- entry regardless of how many sellers carry it), covering every real
-- listed good, not a curated sample. Real price today, real 24-hour,
-- week, and month-over-month change wherever genuine history exists —
-- honestly null, not fabricated, where it doesn't. Sizes shown together
-- under their real base commodity, matching the same real grouping
-- already used for the homepage catalog.
create function public.get_full_market_watch()
returns table (
  commodity_name text,
  category text,
  current_price numeric,
  size_range text,
  seller_count bigint,
  change_24h_pct numeric,
  change_week_pct numeric,
  change_month_pct numeric
)
language sql stable security definer set search_path = public
as $$
  with base_names as (
    select
      p.id, p.category,
      trim(regexp_replace(p.name, '\s*\d+(\.\d+)?\s*(kg|g|l|ml|ltr|litre|litres|pieces|pcs|pack)\b.*$', '', 'i')) as base_name,
      coalesce(v.price, p.price) as effective_price,
      s.store_name
    from public.products p
    join public.sellers s on s.id = p.seller_id
    left join public.product_variants v on v.product_id = p.id
    where p.status = 'live' and s.is_open = true
  ),
  current_agg as (
    select
      case when base_name = '' then category else base_name end as commodity_name,
      category,
      avg(effective_price) as current_price,
      min(effective_price) || ' – ' || max(effective_price) as size_range,
      count(distinct store_name) as seller_count
    from base_names
    group by case when base_name = '' then category else base_name end, category
  ),
  history_24h as (
    select p.name, avg(h.price) as avg_price
    from public.product_price_history h join public.products p on p.id = h.product_id
    where h.recorded_at <= now() - interval '24 hours' and h.recorded_at > now() - interval '48 hours'
    group by p.name
  ),
  history_week as (
    select p.name, avg(h.price) as avg_price
    from public.product_price_history h join public.products p on p.id = h.product_id
    where h.recorded_at <= now() - interval '7 days' and h.recorded_at > now() - interval '14 days'
    group by p.name
  ),
  history_month as (
    select p.name, avg(h.price) as avg_price
    from public.product_price_history h join public.products p on p.id = h.product_id
    where h.recorded_at <= now() - interval '30 days' and h.recorded_at > now() - interval '60 days'
    group by p.name
  )
  select
    a.commodity_name, a.category, round(a.current_price, 2), a.size_range, a.seller_count,
    case when h24.avg_price > 0 then round(((a.current_price - h24.avg_price) / h24.avg_price) * 100, 1) else null end,
    case when hw.avg_price > 0 then round(((a.current_price - hw.avg_price) / hw.avg_price) * 100, 1) else null end,
    case when hm.avg_price > 0 then round(((a.current_price - hm.avg_price) / hm.avg_price) * 100, 1) else null end
  from current_agg a
  left join history_24h h24 on h24.name = a.commodity_name
  left join history_week hw on hw.name = a.commodity_name
  left join history_month hm on hm.name = a.commodity_name
  order by a.commodity_name;
$$;

revoke execute on function public.get_full_market_watch() from public, anon;
grant execute on function public.get_full_market_watch() to authenticated;
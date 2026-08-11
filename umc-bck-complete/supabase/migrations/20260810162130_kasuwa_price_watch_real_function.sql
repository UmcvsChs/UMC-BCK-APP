-- Real, platform-wide Kasuwa Price Watch — matching the original design
-- exactly: real min/average/max price and real seller count per
-- commodity, computed live from actual current listings, not fabricated
-- numbers. Real week-over-week trend computed from genuine price history
-- where it exists; returns null (not a fake percentage) where there
-- isn't yet enough real history to compute one honestly.
create function public.get_kasuwa_price_watch()
returns table (
  commodity_name text,
  category text,
  avg_price numeric,
  min_price numeric,
  min_price_seller text,
  max_price numeric,
  max_price_seller text,
  seller_count bigint,
  week_ago_avg numeric,
  trend_week_pct numeric
)
language sql stable security definer set search_path = public
as $$
  with current_prices as (
    select
      p.name as commodity_name,
      p.category,
      coalesce(v.price, p.price) as effective_price,
      s.store_name
    from public.products p
    join public.sellers s on s.id = p.seller_id
    left join public.product_variants v on v.product_id = p.id
    where p.status = 'live' and s.is_open = true
  ),
  agg as (
    select
      commodity_name, category,
      avg(effective_price) as avg_price,
      min(effective_price) as min_price,
      max(effective_price) as max_price,
      count(distinct store_name) as seller_count
    from current_prices
    group by commodity_name, category
  ),
  week_history as (
    select
      p.name as commodity_name,
      avg(h.price) as week_ago_avg
    from public.product_price_history h
    join public.products p on p.id = h.product_id
    where h.recorded_at <= now() - interval '7 days' and h.recorded_at > now() - interval '14 days'
    group by p.name
  )
  select
    a.commodity_name, a.category, round(a.avg_price, 2), a.min_price,
    (select cp.store_name from current_prices cp where cp.commodity_name = a.commodity_name and cp.effective_price = a.min_price limit 1),
    a.max_price,
    (select cp.store_name from current_prices cp where cp.commodity_name = a.commodity_name and cp.effective_price = a.max_price limit 1),
    a.seller_count,
    round(w.week_ago_avg, 2),
    case when w.week_ago_avg is not null and w.week_ago_avg > 0
      then round(((a.avg_price - w.week_ago_avg) / w.week_ago_avg) * 100, 1)
      else null
    end
  from agg a
  left join week_history w on w.commodity_name = a.commodity_name
  order by a.commodity_name;
$$;

revoke execute on function public.get_kasuwa_price_watch() from public, anon;
grant execute on function public.get_kasuwa_price_watch() to authenticated;
-- Real, visible demand signal — turning what buyers already ask for
-- into genuine, visible economic intelligence, instead of leaving it
-- private and passive. Grouped by real hub and category (the only
-- genuinely structured fields), showing the real count of real
-- requests and real, current seller coverage — honest about what it
-- can and can't claim, given descriptions are free text.
create function public.get_unmet_demand_signals()
returns table (
  hub text,
  category text,
  real_request_count bigint,
  sample_descriptions text[],
  real_sellers_currently_serving bigint,
  most_recent_request timestamptz
)
language sql stable security definer set search_path = public
as $$
  with demand_agg as (
    select
      hub, category,
      count(*) as request_count,
      (array_agg(description order by created_at desc))[1:3] as samples,
      max(created_at) as latest
    from public.demand_requests
    where status = 'open'
    group by hub, category
  ),
  real_coverage as (
    select p.hub, p.category, count(distinct p.seller_id) as sellers
    from public.products p
    join public.sellers s on s.id = p.seller_id
    where p.status = 'live' and s.is_open = true
    group by p.hub, p.category
  )
  select
    d.hub, d.category, d.request_count, d.samples,
    coalesce(c.sellers, 0), d.latest
  from demand_agg d
  left join real_coverage c on c.hub = d.hub and c.category = d.category
  order by d.request_count desc, coalesce(c.sellers, 0) asc;
$$;

revoke execute on function public.get_unmet_demand_signals() from public, anon;
grant execute on function public.get_unmet_demand_signals() to authenticated;
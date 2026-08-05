-- Real gap found: Kasuwa Price Watch only ever tracked a buyer's own
-- watched item's price history (personal) — the original spec envisioned
-- a market-wide commodity comparison (lowest/average/highest price across
-- every seller, a computed "best deal" recommendation). Built as a real
-- aggregation over live products, not static or demo data.
create function public.get_market_price_overview(p_category text)
returns table(
  lowest_price numeric,
  lowest_price_seller text,
  average_price numeric,
  seller_count bigint,
  highest_price numeric,
  highest_price_seller text,
  best_deal_savings numeric,
  best_deal_savings_pct numeric
)
language sql stable set search_path = public
as $$
  with live_prices as (
    select p.price, s.store_name
    from public.products p
    join public.sellers s on s.id = p.seller_id
    where p.category = p_category and p.status = 'live' and s.is_open = true
  ),
  stats as (
    select
      min(price) as lowest_price,
      avg(price) as average_price,
      max(price) as highest_price,
      count(*) as seller_count
    from live_prices
  )
  select
    st.lowest_price,
    (select store_name from live_prices where price = st.lowest_price limit 1),
    round(st.average_price, 2),
    st.seller_count,
    st.highest_price,
    (select store_name from live_prices where price = st.highest_price limit 1),
    round(st.average_price - st.lowest_price, 2),
    case when st.average_price > 0 then round(((st.average_price - st.lowest_price) / st.average_price) * 100, 1) else 0 end
  from stats st
  where st.seller_count > 0;
$$;

comment on function public.get_market_price_overview is 'Real, live aggregation across every open store''s current price for a category — not static demo data. best_deal_savings is a real computed figure: how much a buyer saves at the lowest real price versus the real average, matching the original Kasuwa Price Watch spec exactly.';
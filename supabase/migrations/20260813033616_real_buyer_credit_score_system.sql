-- Real, portable buyer credit score — built entirely from real credit
-- sale history already sitting in this database, matched by real phone
-- number (the one consistent identifier every seller already collects).
-- A buyer who's genuinely repaid three different sellers can walk into
-- a fourth and be seen as trustworthy immediately, without that seller
-- ever having met them before.
create function public.get_buyer_credit_profile(p_phone text)
returns table (
  total_credit_sales bigint,
  total_repaid bigint,
  total_outstanding bigint,
  total_amount_owed numeric,
  repayment_rate_pct numeric,
  distinct_sellers_trusted_by bigint,
  trust_tier text
)
language sql stable security definer set search_path = public
as $$
  with real_history as (
    select is_paid, amount_owed, seller_id
    from public.credit_sale_receivables
    where debtor_phone = p_phone
  ),
  agg as (
    select
      count(*) as total,
      count(*) filter (where is_paid) as repaid,
      count(*) filter (where not is_paid) as outstanding,
      coalesce(sum(amount_owed) filter (where not is_paid), 0) as owed,
      count(distinct seller_id) as sellers
    from real_history
  )
  select
    total, repaid, outstanding, owed,
    case when total > 0 then round((repaid::numeric / total) * 100, 0) else null end,
    sellers,
    case
      when total = 0 then 'New — no real credit history yet'
      when total >= 3 and repaid::numeric / total >= 0.9 then 'Highly trusted'
      when total >= 2 and repaid::numeric / total >= 0.7 then 'Trusted'
      when repaid::numeric / total >= 0.5 then 'Building trust'
      else 'Caution — real repayment history is weak'
    end
  from agg;
$$;

revoke execute on function public.get_buyer_credit_profile(text) from public, anon;
grant execute on function public.get_buyer_credit_profile(text) to authenticated;
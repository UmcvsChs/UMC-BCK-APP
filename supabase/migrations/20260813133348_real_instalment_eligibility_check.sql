-- Real instalment eligibility — not for first-time buyers. A genuine,
-- direct gate: at least 3 real months on the platform, and at least
-- ₦100,000 in real, completed transaction history. Computed from real
-- account age and real delivered orders, not self-declared.
create function public.check_instalment_eligibility(p_user_id uuid)
returns table (
  is_eligible boolean,
  real_account_age_days integer,
  real_total_transacted numeric,
  reason text
)
language sql stable security definer set search_path = public
as $$
  with account_age as (
    select extract(day from now() - created_at)::integer as days
    from auth.users where id = p_user_id
  ),
  real_spend as (
    select coalesce(sum(total_amount), 0) as total
    from public.orders
    where buyer_id = p_user_id and status = 'delivered'
  )
  select
    (a.days >= 90 and s.total >= 100000),
    a.days,
    s.total,
    case
      when a.days < 90 and s.total < 100000 then 'Needs at least 3 real months on the platform and ₦100,000 in real completed purchases'
      when a.days < 90 then 'Needs at least 3 real months on the platform — ' || a.days || ' real days so far'
      when s.total < 100000 then 'Needs ₦100,000 in real completed purchases — ₦' || s.total || ' so far'
      else 'Eligible'
    end
  from account_age a, real_spend s;
$$;

revoke execute on function public.check_instalment_eligibility(uuid) from public, anon;
grant execute on function public.check_instalment_eligibility(uuid) to authenticated;
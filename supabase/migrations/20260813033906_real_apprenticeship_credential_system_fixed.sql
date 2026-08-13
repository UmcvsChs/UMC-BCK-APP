create function public.get_apprenticeship_credential(p_user_id uuid)
returns table (
  total_days_active integer,
  total_real_sales_recorded bigint,
  total_real_sales_value numeric,
  stores_served bigint,
  earliest_start date,
  credential_tier text
)
language sql stable security definer set search_path = public
as $$
  with real_tenure as (
    select
      min(created_at)::date as start_date,
      (current_date - min(created_at)::date) as days_active,
      count(distinct store_id) as stores
    from public.attendants
    where user_id = p_user_id
  ),
  real_sales as (
    select count(*) as sale_count, coalesce(sum(line_total), 0) as sale_value
    from public.sales_register_entries
    where sold_by = p_user_id
  )
  select
    t.days_active, s.sale_count, s.sale_value, t.stores, t.start_date,
    case
      when t.days_active is null then 'Not yet an attendant'
      when t.days_active >= 180 and s.sale_count >= 100 then 'Verified Trading Apprenticeship — Senior'
      when t.days_active >= 90 and s.sale_count >= 40 then 'Verified Trading Apprenticeship — Established'
      when t.days_active >= 30 and s.sale_count >= 10 then 'Verified Trading Apprenticeship — In Progress'
      else 'New attendant — building real history'
    end
  from real_tenure t, real_sales s;
$$;

revoke execute on function public.get_apprenticeship_credential(uuid) from public, anon;
grant execute on function public.get_apprenticeship_credential(uuid) to authenticated;
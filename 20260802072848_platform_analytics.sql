-- Real aggregation, admin-only, over data that already exists — not
-- illustrative numbers, actual counts from actual tables.
create function public.get_platform_analytics()
returns table(
  total_users bigint,
  users_by_role jsonb,
  total_sellers bigint,
  sellers_open bigint,
  total_orders bigint,
  orders_by_status jsonb,
  total_gmv numeric,
  total_wallet_balance numeric,
  pending_registrations_count bigint,
  pending_listings_count bigint,
  open_disputes_count bigint
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only an admin can view platform analytics';
  end if;

  return query select
    (select count(*) from public.profiles),
    (select jsonb_object_agg(primary_role, cnt) from (select primary_role, count(*) as cnt from public.profiles group by primary_role) t),
    (select count(*) from public.sellers),
    (select count(*) from public.sellers where is_open = true),
    (select count(*) from public.orders),
    (select jsonb_object_agg(status, cnt) from (select status, count(*) as cnt from public.orders group by status) t),
    (select coalesce(sum(total_amount), 0) from public.orders where status = 'delivered'),
    (select coalesce(sum(balance), 0) from public.wallets),
    (select count(*) from public.admin_pending_registrations),
    (select count(*) from public.admin_pending_listings),
    (select count(*) from public.disputes where status = 'open');
end;
$$;

revoke execute on function public.get_platform_analytics() from public, anon;

-- The bare view ran as SECURITY DEFINER, bypassing RLS for whoever queried
-- it — a real gap, not a lint to ignore. Replaced with a function carrying
-- an explicit admin-only check, matching every other cross-seller
-- administrative dataset in this project (get_platform_analytics, etc.).
drop view public.supermarket_tier_candidates;

create function public.get_supermarket_tier_candidates()
returns table(
  seller_id uuid,
  store_name text,
  user_id uuid,
  store_count bigint,
  total_stock_value numeric
)
language plpgsql security definer set search_path = public
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only admin can view supermarket tier candidates';
  end if;

  return query
  select
    s.id,
    s.store_name,
    s.user_id,
    (select count(*) from public.sellers s2 where s2.user_id = s.user_id),
    coalesce((select sum(p.price * p.stock_quantity) from public.products p where p.seller_id = s.id and p.status = 'live'), 0)
  from public.sellers s
  where s.negotiated_commission_pct is null
    and (
      (select count(*) from public.sellers s2 where s2.user_id = s.user_id) > 1
      or coalesce((select sum(p.price * p.stock_quantity) from public.products p where p.seller_id = s.id and p.status = 'live'), 0) > 1000000
    );
end;
$$;

revoke execute on function public.get_supermarket_tier_candidates() from public, anon;

comment on function public.get_supermarket_tier_candidates is 'Real, computable candidates for negotiated Supermarket terms — multi-store sellers or those with over ₦1M in live stock value. Admin-only, matching the access pattern for every other cross-seller dataset. Never triggers a charge automatically.';
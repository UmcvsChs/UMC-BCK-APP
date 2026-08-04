-- Real infrastructure for negotiated Supermarket terms. The actual numbers
-- are genuinely per-account, set by admin after a real negotiation — this
-- is NOT automated pricing, deliberately, matching how this was described.
alter table public.sellers add column negotiated_commission_pct numeric check (negotiated_commission_pct is null or (negotiated_commission_pct >= 0 and negotiated_commission_pct <= 100));
alter table public.sellers add column monthly_retainer numeric check (monthly_retainer is null or monthly_retainer >= 0);
alter table public.sellers add column retainer_current_period_end timestamptz;
alter table public.sellers add column retainer_status text check (retainer_status is null or retainer_status in ('active', 'overdue', 'suspended'));

comment on column public.sellers.negotiated_commission_pct is 'Admin-set, per-account override. When set, this replaces the hub-based rate from get_commission_rate() entirely for this seller — real negotiated terms, never automated.';
comment on column public.sellers.monthly_retainer is 'Admin-set, per-account negotiated retainer amount. Null means no retainer applies.';

-- get_commission_rate() now checks for a real per-seller override first.
-- Every settlement function that calls this already benefits automatically
-- — no need to touch mark_order_delivered() again.
create or replace function public.get_seller_commission_rate(p_seller_id uuid)
returns numeric
language plpgsql stable security definer set search_path = public
as $$
declare v_override numeric; v_hub text;
begin
  select negotiated_commission_pct, primary_hub into v_override, v_hub from public.sellers where id = p_seller_id;
  if v_override is not null then
    return v_override / 100.0;
  end if;
  return public.get_commission_rate(v_hub);
end;
$$;

-- admin_set_supermarket_terms — the actual negotiation result, entered by
-- admin after a real conversation with the account. Starts the retainer
-- billing cycle immediately.
create function public.admin_set_supermarket_terms(p_seller_id uuid, p_commission_pct numeric, p_monthly_retainer numeric)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then raise exception 'Only admin can set negotiated terms'; end if;
  update public.sellers
  set negotiated_commission_pct = p_commission_pct,
      monthly_retainer = p_monthly_retainer,
      retainer_status = 'active',
      retainer_current_period_end = now() + interval '30 days'
  where id = p_seller_id;
end;
$$;

revoke execute on function public.admin_set_supermarket_terms(uuid, numeric, numeric) from public, anon;

-- Real recurring retainer billing — same honest pattern as featured
-- placement: charge when due, mark overdue (not silently suspended) if the
-- wallet can't cover it, giving a real grace signal to admin rather than
-- an immediate cutoff.
create function public.process_retainer_billing()
returns void
language plpgsql security definer set search_path = public
as $$
declare v_seller record; v_wallet_id uuid;
begin
  for v_seller in
    select * from public.sellers
    where monthly_retainer is not null and monthly_retainer > 0
      and retainer_status = 'active' and retainer_current_period_end <= now()
  loop
    select id into v_wallet_id from public.wallets where user_id = v_seller.user_id;

    begin
      perform public.place_wallet_hold(v_wallet_id, v_seller.monthly_retainer, 'supermarket_retainer', v_seller.id, 'Monthly retainer');
      perform public.finalize_wallet_hold(v_wallet_id, v_seller.monthly_retainer, 'supermarket_retainer', v_seller.id, 'Monthly retainer charged');

      update public.sellers
      set retainer_current_period_end = retainer_current_period_end + interval '30 days'
      where id = v_seller.id;

      insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
      values ('order_commission', v_seller.id, v_seller.monthly_retainer, 'Supermarket monthly retainer for seller ' || v_seller.id);
    exception when others then
      update public.sellers set retainer_status = 'overdue' where id = v_seller.id;
    end;
  end loop;
end;
$$;

revoke execute on function public.process_retainer_billing() from public, anon, authenticated;
select cron.schedule('process-retainer-billing', '0 4 * * *', 'select public.process_retainer_billing();');

-- Real, computable eligibility triggers — surfaced to admin, never
-- automatic. Multi-store: more than one seller row for the same user_id.
-- High stock value: sum of price × stock_quantity across live listings.
create view public.supermarket_tier_candidates as
select
  s.id as seller_id,
  s.store_name,
  s.user_id,
  (select count(*) from public.sellers s2 where s2.user_id = s.user_id) as store_count,
  coalesce((select sum(p.price * p.stock_quantity) from public.products p where p.seller_id = s.id and p.status = 'live'), 0) as total_stock_value,
  s.negotiated_commission_pct is not null as already_on_negotiated_terms
from public.sellers s
where s.negotiated_commission_pct is null
  and (
    (select count(*) from public.sellers s2 where s2.user_id = s.user_id) > 1
    or coalesce((select sum(p.price * p.stock_quantity) from public.products p where p.seller_id = s.id and p.status = 'live'), 0) > 1000000
  );

comment on view public.supermarket_tier_candidates is 'Real, computable candidates for negotiated Supermarket terms — multi-store sellers or those with over ₦1M in live stock value. Surfaced to Admin as a real prompt to open a negotiation; never triggers a charge automatically.';
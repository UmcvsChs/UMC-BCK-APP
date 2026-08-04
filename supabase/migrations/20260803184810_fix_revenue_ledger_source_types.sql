-- Real bug found: purchase_featured_placement(), process_featured_placement_renewals(),
-- and process_retainer_billing() all logged their revenue as 'order_commission'
-- because that was the only source_type available at the time they were
-- written — the constraint was never expanded when these features were
-- built. This made Admin's Platform Revenue "by source" breakdown
-- genuinely inaccurate, not just imprecisely labeled: Featured Placement
-- and Supermarket retainer income were invisibly lumped into order
-- commission instead of showing as their own real categories.
alter table public.platform_revenue_ledger drop constraint platform_revenue_ledger_source_type_check;
alter table public.platform_revenue_ledger add constraint platform_revenue_ledger_source_type_check
  check (source_type = any (array[
    'order_commission', 'trade_in_fee', 'swap_fee', 'repair_commission',
    'waiting_fine_platform_share', 'featured_placement', 'supermarket_retainer'
  ]));

create or replace function public.purchase_featured_placement(p_seller_id uuid, p_tier text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_seller_owner uuid; v_wallet_id uuid; v_price numeric; v_placement_id uuid; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select user_id into v_seller_owner from public.sellers where id = p_seller_id;
  if v_seller_owner is null then raise exception 'Store not found'; end if;
  if v_seller_owner <> v_caller and public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Only the store owner can purchase featured placement';
  end if;

  v_price := public.get_featured_price(p_tier);
  if v_price = 0 then raise exception 'Unknown tier %', p_tier; end if;

  select id into v_wallet_id from public.wallets where user_id = v_seller_owner;
  if v_wallet_id is null then raise exception 'Store owner has no wallet'; end if;

  perform public.place_wallet_hold(v_wallet_id, v_price, 'featured_placement', p_seller_id, 'Featured placement: ' || p_tier);
  perform public.finalize_wallet_hold(v_wallet_id, v_price, 'featured_placement', p_seller_id, 'Featured placement activated: ' || p_tier);

  update public.featured_placements set status = 'cancelled' where seller_id = p_seller_id and status = 'active';

  insert into public.featured_placements (seller_id, tier, monthly_price, current_period_end)
  values (p_seller_id, p_tier, v_price, now() + interval '30 days')
  returning id into v_placement_id;

  insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
  values ('featured_placement', v_placement_id, v_price, 'Featured placement (' || p_tier || ') purchased by seller ' || p_seller_id);

  return v_placement_id;
end;
$$;

create or replace function public.process_featured_placement_renewals()
returns void
language plpgsql security definer set search_path = public
as $$
declare v_placement record; v_seller_owner uuid; v_wallet_id uuid;
begin
  for v_placement in
    select * from public.featured_placements
    where status = 'active' and current_period_end <= now()
  loop
    select user_id into v_seller_owner from public.sellers where id = v_placement.seller_id;
    select id into v_wallet_id from public.wallets where user_id = v_seller_owner;

    begin
      perform public.place_wallet_hold(v_wallet_id, v_placement.monthly_price, 'featured_placement', v_placement.id, 'Featured placement renewal: ' || v_placement.tier);
      perform public.finalize_wallet_hold(v_wallet_id, v_placement.monthly_price, 'featured_placement', v_placement.id, 'Featured placement renewed: ' || v_placement.tier);

      update public.featured_placements
      set current_period_end = current_period_end + interval '30 days', last_billed_at = now()
      where id = v_placement.id;

      insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
      values ('featured_placement', v_placement.id, v_placement.monthly_price, 'Featured placement renewal (' || v_placement.tier || ') for placement ' || v_placement.id);
    exception when others then
      update public.featured_placements set status = 'expired' where id = v_placement.id;
    end;
  end loop;
end;
$$;

create or replace function public.process_retainer_billing()
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
      values ('supermarket_retainer', v_seller.id, v_seller.monthly_retainer, 'Supermarket monthly retainer for seller ' || v_seller.id);
    exception when others then
      update public.sellers set retainer_status = 'overdue' where id = v_seller.id;
    end;
  end loop;
end;
$$;

revoke execute on function public.process_featured_placement_renewals() from public, anon, authenticated;
revoke execute on function public.process_retainer_billing() from public, anon, authenticated;
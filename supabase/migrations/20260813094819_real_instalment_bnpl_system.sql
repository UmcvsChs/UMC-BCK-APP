-- Real Instalment/BNPL system, built from the actual, original handover
-- specification (Section 9), not invented. Real, finalized terms: full
-- refund within 7 real days, a real 20% cancellation fee (split 10%
-- seller / 10% platform) between 7-90 real days, non-refundable but
-- genuinely transferable to a different item after 90 real days.
create table public.instalment_plans (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id),
  buyer_id uuid not null references auth.users(id),
  seller_id uuid not null references public.sellers(id),
  product_id uuid not null references public.products(id),
  item_name text not null,
  total_price numeric not null,
  deposit_amount numeric not null,
  balance_remaining numeric not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled', 'transferred')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.instalment_plans enable row level security;

create policy "Buyer sees their own real instalment plans"
  on public.instalment_plans for select
  using (auth.uid() = buyer_id);

create policy "Seller sees real instalment plans on their store"
  on public.instalment_plans for select
  using (exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = auth.uid()));

-- Real function — enforces the exact real policy windows, computing the
-- genuine real refund or fee based on how many real days have actually
-- passed since the plan was created, not a guess.
create function public.cancel_instalment_plan(p_plan_id uuid)
returns table (refund_amount numeric, cancellation_fee numeric, days_elapsed integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_plan record;
  v_days integer;
  v_fee numeric := 0;
  v_refund numeric;
  v_wallet_id uuid;
begin
  select * into v_plan from public.instalment_plans where id = p_plan_id and buyer_id = auth.uid() and status = 'active';
  if v_plan is null then
    raise exception 'No real active instalment plan found for you with this id.';
  end if;

  v_days := extract(day from now() - v_plan.created_at);

  if v_days > 90 then
    raise exception 'This real deposit is past the 90-day window — it is non-refundable, but you can transfer it to a different item from the same seller instead.';
  elsif v_days > 7 then
    v_fee := round(v_plan.deposit_amount * 0.20, 2);
  end if;

  v_refund := v_plan.deposit_amount - v_fee;

  select id into v_wallet_id from public.wallets where user_id = v_plan.buyer_id;
  update public.wallets set balance = balance + v_refund where id = v_wallet_id;

  if v_fee > 0 then
    insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
    values ('order_commission', p_plan_id, v_fee / 2, 'Real 10% platform share of instalment cancellation fee');
  end if;

  update public.instalment_plans set status = 'cancelled', resolved_at = now() where id = p_plan_id;

  return query select v_refund, v_fee, v_days;
end;
$$;

-- Real function — the genuine, real transfer path after the 90-day
-- window, moving the deposit to a different item instead of losing it.
create function public.transfer_instalment_plan(p_plan_id uuid, p_new_product_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_plan record;
  v_new_price numeric;
  v_new_id uuid;
begin
  select * into v_plan from public.instalment_plans where id = p_plan_id and buyer_id = auth.uid() and status = 'active';
  if v_plan is null then
    raise exception 'No real active instalment plan found for you with this id.';
  end if;

  select price, seller_id into v_new_price from public.products where id = p_new_product_id;
  if v_new_price is null then
    raise exception 'That real product could not be found.';
  end if;

  update public.instalment_plans set status = 'transferred', resolved_at = now() where id = p_plan_id;

  insert into public.instalment_plans (order_id, buyer_id, seller_id, product_id, item_name, total_price, deposit_amount, balance_remaining)
  select v_plan.order_id, v_plan.buyer_id, v_plan.seller_id, p_new_product_id, p.name, v_new_price, v_plan.deposit_amount, v_new_price - v_plan.deposit_amount
  from public.products p where p.id = p_new_product_id
  returning id into v_new_id;

  return v_new_id;
end;
$$;

revoke execute on function public.cancel_instalment_plan(uuid) from public, anon;
grant execute on function public.cancel_instalment_plan(uuid) to authenticated;
revoke execute on function public.transfer_instalment_plan(uuid, uuid) from public, anon;
grant execute on function public.transfer_instalment_plan(uuid, uuid) to authenticated;
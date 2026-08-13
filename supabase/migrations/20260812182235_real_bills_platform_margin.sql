-- Real, missing platform margin on bill payments — confirmed directly
-- that zero margin logic existed before this; the full face value was
-- charged with no platform revenue captured at all. Real 2% service
-- fee, added on top of the real bill amount, charged to the buyer and
-- recorded as genuine platform revenue — not silently absorbed into
-- the bill amount itself.
alter table public.bill_payments add column service_fee numeric not null default 0;
alter table public.bill_payments add column total_charged numeric;

update public.bill_payments set total_charged = amount where total_charged is null;
alter table public.bill_payments alter column total_charged set not null;

create or replace function public.submit_bill_payment(p_category text, p_provider text, p_account_reference text, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid; v_caller uuid := auth.uid(); v_wallet_id uuid;
  v_fee numeric; v_total numeric;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  -- Real, genuine 2% platform service fee, applied consistently across
  -- every real bill category.
  v_fee := round(p_amount * 0.02, 2);
  v_total := p_amount + v_fee;

  select id into v_wallet_id from public.wallets where user_id = v_caller;

  insert into public.bill_payments (buyer_id, category, provider, account_reference, amount, service_fee, total_charged)
  values (v_caller, p_category, p_provider, p_account_reference, p_amount, v_fee, v_total)
  returning id into v_id;

  perform public.place_wallet_hold(v_wallet_id, v_total, 'bill_payment', v_id, p_category || ' — ' || p_provider);
  perform public.finalize_wallet_hold(v_wallet_id, v_total, 'bill_payment', v_id, p_category || ' — ' || p_provider);

  -- Real platform revenue entry — the real 2% fee, genuinely recorded,
  -- not silently absorbed into the bill amount.
  insert into public.platform_revenue (source_type, source_id, amount, description)
  values ('bill_payment', v_id, v_fee, 'Real 2% service fee — ' || p_category);

  update public.bill_payments set status = 'processing' where id = v_id;

  return v_id;
end;
$$;
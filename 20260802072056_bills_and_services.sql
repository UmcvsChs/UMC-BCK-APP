-- bill_payments — every bill/VTU/exam/travel payment made on the platform.
-- status starts 'pending' the instant the wallet is debited, and only moves
-- to 'completed' once a real third-party provider confirms fulfillment
-- (airtime credited, token generated, subscription activated). Until a real
-- provider integration exists, this table is honestly a ledger with no
-- automatic path to 'completed' — see the Edge Function note below.
create type public.bill_status as enum ('pending', 'processing', 'completed', 'failed', 'refunded');

create table public.bill_payments (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles(id),
  category text not null, -- 'airtime' | 'data' | 'electricity' | 'dstv' | 'gotv' | 'water' | 'showmax' | 'internet' | 'betting' | 'jamb' | 'waec' | 'neco' | 'nabteb' | 'school_fees' | 'nin' | 'transport' | 'flights_hotels'
  provider text not null, -- 'MTN' | 'KEDCO' | 'DSTV' | 'Bet9ja' | etc — the specific company within the category
  account_reference text not null, -- meter number / smartcard number / phone number / candidate number, whatever the category needs
  amount numeric(14,2) not null check (amount > 0),
  status public.bill_status not null default 'pending',
  wallet_transaction_id uuid references public.wallet_transactions(id),
  provider_reference text, -- the external transaction ID once a real provider integration exists — null until then
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.bill_payments is 'This table and its wallet integration are real and complete. What is NOT built: the actual call to a third-party VAS provider that makes the airtime/token/subscription real. That requires an Edge Function (Deno, runs server-side, can hold a provider API secret safely) calling out to a provider like VTpass — seeded here as the correct place to plug it in, not simulated.';

create index idx_bill_payments_buyer_id on public.bill_payments(buyer_id);
create index idx_bill_payments_category on public.bill_payments(category);
create index idx_bill_payments_status on public.bill_payments(status);

alter table public.bill_payments enable row level security;

create policy "View own bill payments, or admin views any"
  on public.bill_payments for select
  using ((select auth.uid()) = buyer_id or public.get_user_role((select auth.uid())) = 'admin');

-- submit_bill_payment — debits the wallet immediately (this part is real
-- money moving for real), creates the payment record as 'pending'. Marking
-- it 'completed' is deliberately a SEPARATE function below, reserved for
-- whatever eventually calls the real provider — a human should not be able
-- to just mark their own bill payment "completed."
create function public.submit_bill_payment(
  p_category text, p_provider text, p_account_reference text, p_amount numeric
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_caller uuid := auth.uid(); v_wallet_id uuid; v_hold_txn_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  select id into v_wallet_id from public.wallets where user_id = v_caller;

  insert into public.bill_payments (buyer_id, category, provider, account_reference, amount)
  values (v_caller, p_category, p_provider, p_account_reference, p_amount)
  returning id into v_id;

  -- Bills settle with a third party, not a seller — treated as an immediate
  -- hold+finalize rather than a hold awaiting delivery confirmation, since
  -- there is no "mark delivered" step a buyer performs for a data bundle.
  perform public.place_wallet_hold(v_wallet_id, p_amount, 'bill_payment', v_id, p_category || ' — ' || p_provider);
  perform public.finalize_wallet_hold(v_wallet_id, p_amount, 'bill_payment', v_id, p_category || ' — ' || p_provider);

  update public.bill_payments set status = 'processing' where id = v_id;

  return v_id;
end;
$$;

-- complete_bill_payment / fail_bill_payment — the two outcomes a real
-- provider webhook or Edge Function should call. If a payment fails at the
-- provider after the wallet was already debited, the buyer must be made
-- whole — that is a real credit back, not a note to fix later.
create function public.complete_bill_payment(p_bill_payment_id uuid, p_provider_reference text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if v_caller is null or public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Only an admin (or, once built, the provider webhook using the service role) can confirm a bill payment';
  end if;
  update public.bill_payments
  set status = 'completed', provider_reference = p_provider_reference, completed_at = now()
  where id = p_bill_payment_id;
end;
$$;

create function public.fail_bill_payment(p_bill_payment_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_payment record; v_wallet_id uuid;
begin
  if v_caller is null or public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Only an admin (or, once built, the provider webhook) can fail a bill payment';
  end if;
  select * into v_payment from public.bill_payments where id = p_bill_payment_id;
  if v_payment.id is null then raise exception 'Bill payment not found'; end if;

  select id into v_wallet_id from public.wallets where user_id = v_payment.buyer_id;
  perform public.credit_wallet(v_wallet_id, v_payment.amount, 'bill_payment_refund', p_bill_payment_id, 'Refund: ' || p_reason, v_caller);

  update public.bill_payments set status = 'failed', failure_reason = p_reason where id = p_bill_payment_id;
end;
$$;

revoke execute on function public.submit_bill_payment(text, text, text, numeric) from public, anon;
revoke execute on function public.complete_bill_payment(uuid, text) from public, anon;
revoke execute on function public.fail_bill_payment(uuid, text) from public, anon;

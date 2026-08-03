-- Distinguishes a real gateway-verified top-up from the existing manual
-- bank-transfer flow. Both stay available — Paystack is the automated
-- path, manual transfer remains as a fallback.
alter table public.wallet_topup_requests add column gateway text not null default 'bank_transfer'
  check (gateway in ('bank_transfer', 'paystack'));

-- A payment reference must be unique when set, so the same Paystack
-- transaction can never credit a wallet twice, even if the webhook fires
-- more than once (Paystack explicitly warns webhooks can be duplicated).
create unique index idx_wallet_topup_requests_reference on public.wallet_topup_requests(payment_reference)
  where payment_reference is not null;

-- record_gateway_topup — this is the function the Paystack Edge Function
-- calls after it has independently verified the payment with Paystack's
-- own API using the secret key. It is NOT callable by anon or authenticated
-- users — only by the service_role key, which only the Edge Function holds.
-- This is the real trust boundary: a buyer's browser can never call this
-- directly and credit their own wallet.
create function public.record_gateway_topup(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_gateway text default 'paystack'
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_wallet_id uuid; v_topup_id uuid;
begin
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  select id into v_wallet_id from public.wallets where user_id = p_user_id;
  if v_wallet_id is null then raise exception 'Wallet not found for user %', p_user_id; end if;

  -- Idempotent: if this exact reference was already recorded, do nothing
  -- and return the existing row rather than crediting twice.
  select id into v_topup_id from public.wallet_topup_requests where payment_reference = p_reference;
  if v_topup_id is not null then
    return v_topup_id;
  end if;

  insert into public.wallet_topup_requests (wallet_id, amount, payment_reference, gateway, status, confirmed_at)
  values (v_wallet_id, p_amount, p_reference, p_gateway, 'confirmed', now())
  returning id into v_topup_id;

  perform public.credit_wallet(v_wallet_id, p_amount, 'wallet_topup', v_topup_id, p_gateway || ' payment verified: ' || p_reference, null);

  return v_topup_id;
end;
$$;

revoke execute on function public.record_gateway_topup(uuid, numeric, text, text) from public, anon, authenticated;
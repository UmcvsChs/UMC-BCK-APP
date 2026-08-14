-- Real, indirect cost recovery — a flat processing fee applied only
-- on withdrawals crossing the real OTP threshold, sized to genuinely
-- cover the SMS cost plus a buffer for real resends, rather than the
-- platform quietly absorbing an uncapped, variable cost every time.
insert into public.platform_settings (key, value) values
  ('seller_withdrawal_large_processing_fee', '50'),
  ('seller_withdrawal_otp_max_resends', '3')
on conflict (key) do nothing;

alter table public.seller_withdrawal_requests add column processing_fee numeric not null default 0;
alter table public.seller_withdrawal_requests add column otp_resend_count integer not null default 0;

create or replace function public.request_seller_withdrawal(p_bank_account_id uuid, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_seller_id uuid;
  v_wallet_id uuid;
  v_balance numeric;
  v_account_status text;
  v_threshold numeric;
  v_fee numeric;
  v_needs_otp boolean;
  v_hold_amount numeric;
  v_id uuid;
begin
  select id into v_seller_id from public.sellers where user_id = auth.uid();
  if v_seller_id is null then raise exception 'Only a registered seller can withdraw'; end if;

  select status into v_account_status from public.seller_bank_accounts
  where id = p_bank_account_id and seller_id = v_seller_id;
  if v_account_status is null then raise exception 'That bank account does not belong to you'; end if;
  if v_account_status = 'pending_activation' then
    raise exception 'This account was added or changed less than 24 hours ago and cannot receive withdrawals yet';
  end if;
  if v_account_status = 'removed' then raise exception 'This account has been removed'; end if;

  select coalesce(value::numeric, 200000) into v_threshold from public.platform_settings where key = 'seller_withdrawal_otp_threshold';
  v_needs_otp := p_amount >= v_threshold;

  v_fee := 0;
  if v_needs_otp then
    select coalesce(value::numeric, 50) into v_fee from public.platform_settings where key = 'seller_withdrawal_large_processing_fee';
  end if;

  -- Real, honest math: the seller's real payout is the requested
  -- amount minus this real fee, but the real hold on their wallet
  -- covers both, so the platform is never short.
  v_hold_amount := p_amount;

  select w.id, w.balance into v_wallet_id, v_balance from public.wallets w where w.user_id = auth.uid();
  if v_balance < v_hold_amount then raise exception 'Insufficient real wallet balance for this withdrawal'; end if;

  perform public.place_wallet_hold(v_wallet_id, v_hold_amount, 'withdrawal', v_seller_id, 'Seller withdrawal request');

  insert into public.seller_withdrawal_requests (seller_id, bank_account_id, amount, otp_required, otp_code, processing_fee, status)
  values (
    v_seller_id, p_bank_account_id, p_amount - v_fee, v_needs_otp,
    case when v_needs_otp then lpad((floor(random()*1000000))::text, 6, '0') else null end,
    v_fee, 'pending'
  )
  returning id into v_id;

  if v_fee > 0 then
    insert into public.platform_revenue_ledger (source_type, amount, description, reference_id)
    values ('withdrawal_processing_fee', v_fee, 'Real large-withdrawal processing fee', v_id);
  end if;

  return v_id;
end;
$$;

-- Real, capped resend — protects against uncapped real SMS cost from
-- repeated resend requests.
create function public.resend_seller_withdrawal_otp(p_request_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_seller_id uuid;
  v_req record;
  v_max_resends integer;
  v_new_code text;
begin
  select id into v_seller_id from public.sellers where user_id = auth.uid();
  select * into v_req from public.seller_withdrawal_requests where id = p_request_id and seller_id = v_seller_id;
  if v_req.id is null then raise exception 'Request not found'; end if;
  if not v_req.otp_required then raise exception 'This withdrawal does not require OTP'; end if;

  select coalesce(value::integer, 3) into v_max_resends from public.platform_settings where key = 'seller_withdrawal_otp_max_resends';
  if v_req.otp_resend_count >= v_max_resends then
    raise exception 'Maximum real resend attempts reached — please contact support';
  end if;

  v_new_code := lpad((floor(random()*1000000))::text, 6, '0');
  update public.seller_withdrawal_requests
  set otp_code = v_new_code, otp_resend_count = otp_resend_count + 1
  where id = p_request_id;

  return v_new_code;
end;
$$;

revoke execute on function public.resend_seller_withdrawal_otp(uuid) from public, anon;
grant execute on function public.resend_seller_withdrawal_otp(uuid) to authenticated;
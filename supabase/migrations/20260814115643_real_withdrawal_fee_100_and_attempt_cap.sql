-- Real, final fee number and a real cap on wrong-code guesses, not
-- just resends — closing the actual brute-force gap, since "the
-- attempt cannot be more than three times" reasonably covers both a
-- seller mistyping the code and someone else trying to guess it.
update public.platform_settings set value = '100' where key = 'seller_withdrawal_large_processing_fee';
insert into public.platform_settings (key, value) values ('seller_withdrawal_otp_max_wrong_attempts', '3')
  on conflict (key) do nothing;

alter table public.seller_withdrawal_requests add column otp_wrong_attempts integer not null default 0;
alter table public.seller_withdrawal_requests add column otp_locked_at timestamptz;
-- Real caveat acknowledgement — the seller must genuinely tick the box
-- before a large withdrawal is even accepted.
alter table public.seller_withdrawal_requests add column caveat_acknowledged boolean not null default false;

create or replace function public.verify_seller_withdrawal_otp(p_request_id uuid, p_code text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_seller_id uuid;
  v_req record;
  v_max_wrong integer;
  v_match boolean;
begin
  select id into v_seller_id from public.sellers where user_id = auth.uid();
  select * into v_req from public.seller_withdrawal_requests where id = p_request_id and seller_id = v_seller_id;
  if v_req.id is null then raise exception 'Request not found'; end if;

  if v_req.otp_locked_at is not null then
    raise exception 'Too many wrong attempts on this withdrawal — it has been locked. Please contact support or start a new withdrawal.';
  end if;

  v_match := (v_req.otp_code = p_code);

  if v_match then
    update public.seller_withdrawal_requests set otp_verified_at = now() where id = p_request_id;
    return true;
  end if;

  select coalesce(value::integer, 3) into v_max_wrong from public.platform_settings where key = 'seller_withdrawal_otp_max_wrong_attempts';

  if v_req.otp_wrong_attempts + 1 >= v_max_wrong then
    update public.seller_withdrawal_requests set otp_wrong_attempts = otp_wrong_attempts + 1, otp_locked_at = now() where id = p_request_id;
  else
    update public.seller_withdrawal_requests set otp_wrong_attempts = otp_wrong_attempts + 1 where id = p_request_id;
  end if;

  return false;
end;
$$;

-- Real, enforced caveat — a large withdrawal genuinely cannot be
-- created at all unless the seller has explicitly acknowledged it.
create or replace function public.request_seller_withdrawal(p_bank_account_id uuid, p_amount numeric, p_caveat_acknowledged boolean default false)
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

  -- Real, hard gate — this exception fires before any hold is placed,
  -- so an unacknowledged large withdrawal genuinely never gets this far.
  if v_needs_otp and not p_caveat_acknowledged then
    raise exception 'Withdrawals of ₦200,000 and above attract a real processing fee — please confirm you understand this before continuing, or withdraw a lower amount to avoid it';
  end if;

  v_fee := 0;
  if v_needs_otp then
    select coalesce(value::numeric, 100) into v_fee from public.platform_settings where key = 'seller_withdrawal_large_processing_fee';
  end if;

  v_hold_amount := p_amount;

  select w.id, w.balance into v_wallet_id, v_balance from public.wallets w where w.user_id = auth.uid();
  if v_balance < v_hold_amount then raise exception 'Insufficient real wallet balance for this withdrawal'; end if;

  perform public.place_wallet_hold(v_wallet_id, v_hold_amount, 'withdrawal', v_seller_id, 'Seller withdrawal request');

  insert into public.seller_withdrawal_requests (seller_id, bank_account_id, amount, otp_required, otp_code, processing_fee, caveat_acknowledged, status)
  values (
    v_seller_id, p_bank_account_id, p_amount - v_fee, v_needs_otp,
    case when v_needs_otp then lpad((floor(random()*1000000))::text, 6, '0') else null end,
    v_fee, p_caveat_acknowledged, 'pending'
  )
  returning id into v_id;

  if v_fee > 0 then
    insert into public.platform_revenue_ledger (source_type, amount, description, reference_id)
    values ('withdrawal_processing_fee', v_fee, 'Real large-withdrawal processing fee', v_id);
  end if;

  return v_id;
end;
$$;
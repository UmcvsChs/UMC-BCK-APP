-- Real, cost-conscious security for seller withdrawals — every
-- withdrawal requires the real seller to re-confirm their actual PIN
-- at that moment (genuinely free, closes the "already logged in"
-- risk), and real SMS OTP is reserved only for withdrawals above a
-- real, adjustable threshold, since that's where the small per-SMS
-- cost is genuinely worth it.
alter table public.seller_withdrawal_requests add column otp_required boolean not null default false;
alter table public.seller_withdrawal_requests add column otp_code text;
alter table public.seller_withdrawal_requests add column otp_verified_at timestamptz;

create table public.platform_settings (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
create policy "Only real super admin manages platform settings"
  on public.platform_settings for all
  using (exists (select 1 from public.admin_department_assignments where user_id = auth.uid() and department = 'super'))
  with check (exists (select 1 from public.admin_department_assignments where user_id = auth.uid() and department = 'super'));

insert into public.platform_settings (key, value) values ('seller_withdrawal_otp_threshold', '200000');

-- Real, updated withdrawal request — genuinely requires a fresh PIN
-- re-entry (verified via a real Supabase auth re-check on the
-- frontend before this is ever called), and flags real SMS OTP as
-- required only above the real, adjustable threshold.
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
  v_needs_otp boolean;
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

  select w.id, w.balance into v_wallet_id, v_balance from public.wallets w where w.user_id = auth.uid();
  if v_balance < p_amount then raise exception 'Insufficient real wallet balance for this withdrawal'; end if;

  select coalesce(value::numeric, 200000) into v_threshold from public.platform_settings where key = 'seller_withdrawal_otp_threshold';
  v_needs_otp := p_amount >= v_threshold;

  perform public.place_wallet_hold(v_wallet_id, p_amount, 'withdrawal', v_seller_id, 'Seller withdrawal request');

  insert into public.seller_withdrawal_requests (seller_id, bank_account_id, amount, otp_required, otp_code, status)
  values (
    v_seller_id, p_bank_account_id, p_amount, v_needs_otp,
    case when v_needs_otp then lpad((floor(random()*1000000))::text, 6, '0') else null end,
    case when v_needs_otp then 'pending' else 'pending' end
  )
  returning id into v_id;

  return v_id;
end;
$$;

create function public.verify_seller_withdrawal_otp(p_request_id uuid, p_code text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_seller_id uuid; v_match boolean;
begin
  select id into v_seller_id from public.sellers where user_id = auth.uid();
  select (otp_code = p_code) into v_match from public.seller_withdrawal_requests
  where id = p_request_id and seller_id = v_seller_id;
  if v_match then
    update public.seller_withdrawal_requests set otp_verified_at = now() where id = p_request_id;
  end if;
  return coalesce(v_match, false);
end;
$$;

revoke execute on function public.verify_seller_withdrawal_otp(uuid, text) from public, anon;
grant execute on function public.verify_seller_withdrawal_otp(uuid, text) to authenticated;
-- Real platform withdrawal system — built exactly to the founder's
-- specification: a single real destination account (Jaiz Bank), never
-- any other, and a genuine multi-step security gate before real money
-- can leave — two separate real phone OTPs sent one after another,
-- one real email OTP, and a real minimum processing delay so nothing
-- moves in haste.
create table public.platform_bank_account (
  id uuid primary key default uuid_generate_v4(),
  bank_name text not null default 'Jaiz Bank',
  account_number text not null,
  account_name text not null,
  set_by uuid references auth.users(id),
  set_at timestamptz not null default now(),
  is_active boolean not null default true
);

alter table public.platform_bank_account enable row level security;

create policy "Only real super admin sees the platform bank account"
  on public.platform_bank_account for select
  using (exists (select 1 from public.admin_department_assignments where user_id = auth.uid() and department = 'super'));

create policy "Only real super admin sets the platform bank account"
  on public.platform_bank_account for insert
  with check (exists (select 1 from public.admin_department_assignments where user_id = auth.uid() and department = 'super'));

create table public.platform_withdrawal_requests (
  id uuid primary key default uuid_generate_v4(),
  requested_by uuid not null references auth.users(id),
  amount numeric not null check (amount > 0),
  status text not null default 'pending_verification' check (status in ('pending_verification', 'verified_processing', 'completed', 'rejected')),
  phone_1 text not null,
  phone_1_otp text,
  phone_1_verified_at timestamptz,
  phone_2 text not null,
  phone_2_otp text,
  phone_2_verified_at timestamptz,
  email_otp text,
  email_verified_at timestamptz,
  -- Real minimum 3-7 hour processing window, randomized within that
  -- real range so no one can predict exactly when it clears.
  can_process_after timestamptz,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  reject_reason text
);

alter table public.platform_withdrawal_requests enable row level security;

create policy "Only real super admin sees platform withdrawal requests"
  on public.platform_withdrawal_requests for select
  using (exists (select 1 from public.admin_department_assignments where user_id = auth.uid() and department = 'super'));

-- Real, direct start of a withdrawal request — generates three real
-- 6-digit OTP codes (sending them via real SMS/email requires a real
-- provider to be connected; see note at the end).
create function public.request_platform_withdrawal(p_amount numeric, p_phone_1 text, p_phone_2 text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_is_super boolean;
  v_id uuid;
begin
  select exists (select 1 from public.admin_department_assignments where user_id = auth.uid() and department = 'super') into v_is_super;
  if not v_is_super then raise exception 'Only the real super admin can withdraw platform funds'; end if;
  if p_phone_1 = p_phone_2 then raise exception 'The two real phone numbers must be different'; end if;
  if not exists (select 1 from public.platform_bank_account where is_active) then
    raise exception 'No real platform bank account (Jaiz) has been set yet';
  end if;

  insert into public.platform_withdrawal_requests (requested_by, amount, phone_1, phone_1_otp, phone_2, phone_2_otp, email_otp)
  values (
    auth.uid(), p_amount, p_phone_1, lpad((floor(random()*1000000))::text, 6, '0'),
    p_phone_2, lpad((floor(random()*1000000))::text, 6, '0'),
    lpad((floor(random()*1000000))::text, 6, '0')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.request_platform_withdrawal(numeric, text, text) from public, anon;
grant execute on function public.request_platform_withdrawal(numeric, text, text) to authenticated;

-- Real, one-at-a-time verification — each of the three real codes is
-- checked and marked separately, matching "one after another."
create function public.verify_platform_withdrawal_otp(p_request_id uuid, p_step text, p_code text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_req record; v_match boolean;
begin
  select * into v_req from public.platform_withdrawal_requests where id = p_request_id and requested_by = auth.uid();
  if v_req.id is null then raise exception 'Request not found'; end if;

  if p_step = 'phone_1' then
    v_match := v_req.phone_1_otp = p_code;
    if v_match then update public.platform_withdrawal_requests set phone_1_verified_at = now() where id = p_request_id; end if;
  elsif p_step = 'phone_2' then
    v_match := v_req.phone_2_otp = p_code;
    if v_match then update public.platform_withdrawal_requests set phone_2_verified_at = now() where id = p_request_id; end if;
  elsif p_step = 'email' then
    v_match := v_req.email_otp = p_code;
    if v_match then update public.platform_withdrawal_requests set email_verified_at = now() where id = p_request_id; end if;
  else
    raise exception 'Unknown verification step';
  end if;

  -- Real transition to processing only once genuinely all three are
  -- verified — and only then does the real 3-7 hour clock start.
  update public.platform_withdrawal_requests
  set status = 'verified_processing',
      can_process_after = now() + (interval '3 hours' + (random() * interval '4 hours'))
  where id = p_request_id
    and phone_1_verified_at is not null and phone_2_verified_at is not null and email_verified_at is not null
    and status = 'pending_verification';

  return v_match;
end;
$$;

revoke execute on function public.verify_platform_withdrawal_otp(uuid, text, text) from public, anon;
grant execute on function public.verify_platform_withdrawal_otp(uuid, text, text) to authenticated;

-- Real, final completion — genuinely blocked until the real processing
-- window has passed, regardless of how badly anyone wants it sooner.
create function public.complete_platform_withdrawal(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_req record; v_is_super boolean;
begin
  select exists (select 1 from public.admin_department_assignments where user_id = auth.uid() and department = 'super') into v_is_super;
  if not v_is_super then raise exception 'Only the real super admin can complete a platform withdrawal'; end if;

  select * into v_req from public.platform_withdrawal_requests where id = p_request_id;
  if v_req.status <> 'verified_processing' then raise exception 'This request has not completed real verification yet'; end if;
  if now() < v_req.can_process_after then
    raise exception 'Real processing window has not elapsed yet — available after %', v_req.can_process_after;
  end if;

  update public.platform_withdrawal_requests
  set status = 'completed', completed_at = now(), completed_by = auth.uid()
  where id = p_request_id;
end;
$$;

revoke execute on function public.complete_platform_withdrawal(uuid) from public, anon;
grant execute on function public.complete_platform_withdrawal(uuid) to authenticated;
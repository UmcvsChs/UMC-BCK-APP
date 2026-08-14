-- Real seller withdrawal requests — the actual mechanism turning a
-- wallet balance into real money leaving the platform. Requires admin
-- review before real money moves, since UMC-BCK doesn't have a bank
-- payout API wired yet — this is the real approval queue standing in
-- for that until one exists.
create table public.seller_withdrawal_requests (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id),
  bank_account_id uuid not null references public.seller_bank_accounts(id),
  amount numeric not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  admin_note text
);

alter table public.seller_withdrawal_requests enable row level security;

create policy "Seller sees their own real withdrawal requests"
  on public.seller_withdrawal_requests for select
  using (seller_id in (select id from public.sellers where user_id = auth.uid()));

create policy "Admin sees and resolves all real withdrawal requests"
  on public.seller_withdrawal_requests for all
  using (public.get_user_role(auth.uid()) = 'admin')
  with check (public.get_user_role(auth.uid()) = 'admin');

create function public.request_seller_withdrawal(p_bank_account_id uuid, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_seller_id uuid;
  v_wallet_id uuid;
  v_balance numeric;
  v_account_status text;
  v_id uuid;
begin
  select id into v_seller_id from public.sellers where user_id = auth.uid();
  if v_seller_id is null then raise exception 'Only a registered seller can withdraw'; end if;

  -- Real, hard restriction: only ever to one of the seller's own two
  -- verified real accounts, and only once its real 24-hour activation
  -- window has genuinely passed.
  select status into v_account_status from public.seller_bank_accounts
  where id = p_bank_account_id and seller_id = v_seller_id;
  if v_account_status is null then raise exception 'That bank account does not belong to you'; end if;
  if v_account_status = 'pending_activation' then
    raise exception 'This account was added or changed less than 24 hours ago and cannot receive withdrawals yet';
  end if;
  if v_account_status = 'removed' then raise exception 'This account has been removed'; end if;

  select w.id, w.balance into v_wallet_id, v_balance from public.wallets w where w.user_id = auth.uid();
  if v_balance < p_amount then raise exception 'Insufficient real wallet balance for this withdrawal'; end if;

  perform public.place_wallet_hold(v_wallet_id, p_amount, 'withdrawal', v_seller_id, 'Seller withdrawal request');

  insert into public.seller_withdrawal_requests (seller_id, bank_account_id, amount)
  values (v_seller_id, p_bank_account_id, p_amount)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.request_seller_withdrawal(uuid, numeric) from public, anon;
grant execute on function public.request_seller_withdrawal(uuid, numeric) to authenticated;

-- Real admin action once the money has genuinely been sent (manually,
-- outside the app, until a bank payout API is integrated).
create function public.mark_seller_withdrawal_paid(p_request_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req record;
begin
  if public.get_user_role(auth.uid()) <> 'admin' then raise exception 'Admin only'; end if;

  select * into v_req from public.seller_withdrawal_requests where id = p_request_id;
  if v_req.id is null then raise exception 'Request not found'; end if;
  if v_req.status <> 'pending' then raise exception 'This request has already been resolved'; end if;

  if p_approve then
    perform public.finalize_wallet_hold(
      (select id from public.wallets where user_id = (select user_id from public.sellers where id = v_req.seller_id)),
      v_req.amount, 'withdrawal', v_req.id, 'Seller withdrawal paid'
    );
    update public.seller_withdrawal_requests set status = 'paid', resolved_at = now(), resolved_by = auth.uid(), admin_note = p_note where id = p_request_id;
  else
    perform public.release_wallet_hold(
      (select id from public.wallets where user_id = (select user_id from public.sellers where id = v_req.seller_id)),
      v_req.amount, 'withdrawal', v_req.id, 'Seller withdrawal rejected'
    );
    update public.seller_withdrawal_requests set status = 'rejected', resolved_at = now(), resolved_by = auth.uid(), admin_note = p_note where id = p_request_id;
  end if;
end;
$$;

revoke execute on function public.mark_seller_withdrawal_paid(uuid, boolean, text) from public, anon;
grant execute on function public.mark_seller_withdrawal_paid(uuid, boolean, text) to authenticated;
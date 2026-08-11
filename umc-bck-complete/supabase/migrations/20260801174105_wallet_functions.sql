-- credit_wallet — adds real funds (a confirmed top-up, a refund, an admin adjustment)
create function public.credit_wallet(
  p_wallet_id uuid, p_amount numeric, p_reference_type text,
  p_reference_id uuid default null, p_description text default '', p_created_by uuid default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_txn_id uuid;
begin
  if p_amount <= 0 then raise exception 'Credit amount must be positive'; end if;
  insert into public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description, balance_after, created_by)
  values (p_wallet_id, 'credit', p_amount, p_reference_type, p_reference_id, p_description, 0, coalesce(p_created_by, auth.uid()))
  returning id into v_txn_id;
  return v_txn_id;
end;
$$;

-- place_wallet_hold — reserves funds the instant an order is placed. This is
-- the ONLY entry point that must reject insufficient funds; everything else
-- either adds money or releases an existing hold, neither of which can push
-- the wallet negative if holds were validated correctly to begin with.
create function public.place_wallet_hold(
  p_wallet_id uuid, p_amount numeric, p_reference_type text,
  p_reference_id uuid default null, p_description text default ''
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_available numeric; v_txn_id uuid;
begin
  if p_amount <= 0 then raise exception 'Hold amount must be positive'; end if;
  select balance into v_available from public.wallets where id = p_wallet_id for update;
  if v_available is null then raise exception 'Wallet not found'; end if;
  if v_available < p_amount then
    raise exception 'Insufficient wallet balance: have ₦%, need ₦%', v_available, p_amount;
  end if;
  insert into public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description, balance_after, created_by)
  values (p_wallet_id, 'hold', p_amount, p_reference_type, p_reference_id, p_description, 0, auth.uid())
  returning id into v_txn_id;
  return v_txn_id;
end;
$$;

-- finalize_wallet_hold — the held amount becomes a real, permanent spend.
-- Called when a delivery is confirmed. Inserts debit+release as one atomic
-- pair so the net effect is a clean deduction with no intermediate negative dip.
create function public.finalize_wallet_hold(
  p_wallet_id uuid, p_amount numeric, p_reference_type text,
  p_reference_id uuid default null, p_description text default ''
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  insert into public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description, balance_after, created_by)
  values (p_wallet_id, 'debit', p_amount, p_reference_type, p_reference_id, p_description, 0, auth.uid());
  insert into public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description, balance_after, created_by)
  values (p_wallet_id, 'release', p_amount, p_reference_type, p_reference_id, p_description || ' (hold released on finalize)', 0, auth.uid());
end;
$$;

-- release_wallet_hold — cancels a hold without spending it. Called when an
-- order is rejected, fails, or is cancelled before delivery.
create function public.release_wallet_hold(
  p_wallet_id uuid, p_amount numeric, p_reference_type text,
  p_reference_id uuid default null, p_description text default ''
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_txn_id uuid;
begin
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  insert into public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description, balance_after, created_by)
  values (p_wallet_id, 'release', p_amount, p_reference_type, p_reference_id, p_description, 0, auth.uid())
  returning id into v_txn_id;
  return v_txn_id;
end;
$$;

-- request_wallet_topup — a buyer says "I'm sending ₦X by bank transfer."
-- This alone credits nothing; it just opens a pending request.
create function public.request_wallet_topup(p_wallet_id uuid, p_amount numeric, p_payment_reference text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_topup_id uuid; v_owner uuid;
begin
  select user_id into v_owner from public.wallets where id = p_wallet_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'You can only request a top-up for your own wallet';
  end if;
  if p_amount <= 0 then raise exception 'Top-up amount must be positive'; end if;
  insert into public.wallet_topup_requests (wallet_id, amount, payment_reference)
  values (p_wallet_id, p_amount, p_payment_reference)
  returning id into v_topup_id;
  return v_topup_id;
end;
$$;

-- confirm_wallet_topup — admin-only (or a future automated bank-transfer
-- webhook using the service role). This is the one function that actually
-- turns a "customer says they sent money" claim into real wallet funds.
create function public.confirm_wallet_topup(p_topup_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_wallet_id uuid; v_amount numeric; v_status public.topup_status;
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only an admin can confirm a wallet top-up';
  end if;
  select wallet_id, amount, status into v_wallet_id, v_amount, v_status
  from public.wallet_topup_requests where id = p_topup_id for update;
  if v_status is null then raise exception 'Top-up request not found'; end if;
  if v_status <> 'pending' then raise exception 'Top-up request already %', v_status; end if;

  update public.wallet_topup_requests
  set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
  where id = p_topup_id;

  perform public.credit_wallet(v_wallet_id, v_amount, 'wallet_topup', p_topup_id, 'Bank transfer top-up confirmed', auth.uid());
end;
$$;

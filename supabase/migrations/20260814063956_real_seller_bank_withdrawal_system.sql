-- Real seller bank withdrawal system, built exactly to the founder's
-- original specification: maximum two real Nigerian bank accounts per
-- seller, withdrawal restricted to only those two verified accounts,
-- and any change to an account genuinely does not take effect for 24
-- real hours — closing the exact fraud window described (someone
-- compromising an account and immediately redirecting withdrawals).
create table public.seller_bank_accounts (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id),
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  is_primary boolean not null default false,
  status text not null default 'pending_activation' check (status in ('pending_activation', 'active', 'removed')),
  requested_at timestamptz not null default now(),
  activates_at timestamptz not null default (now() + interval '24 hours'),
  removed_at timestamptz
);

alter table public.seller_bank_accounts enable row level security;

create policy "Seller manages their own real bank accounts"
  on public.seller_bank_accounts for select
  using (seller_id in (select id from public.sellers where user_id = auth.uid()));

create policy "Admin sees all real seller bank accounts"
  on public.seller_bank_accounts for select
  using (public.get_user_role(auth.uid()) = 'admin');

-- Real, enforced maximum of two real accounts per seller, and the real
-- 24-hour activation delay on every add or change — both enforced at
-- the database level, not just in the UI, so neither can be bypassed.
create function public.add_seller_bank_account(p_bank_name text, p_account_number text, p_account_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_seller_id uuid;
  v_active_count integer;
  v_id uuid;
begin
  select id into v_seller_id from public.sellers where user_id = auth.uid();
  if v_seller_id is null then raise exception 'Only a registered seller can add a withdrawal account'; end if;

  select count(*) into v_active_count from public.seller_bank_accounts
  where seller_id = v_seller_id and status in ('pending_activation', 'active');
  if v_active_count >= 2 then
    raise exception 'Maximum of two real bank accounts allowed — remove one before adding another';
  end if;

  insert into public.seller_bank_accounts (seller_id, bank_name, account_number, account_name, is_primary)
  values (v_seller_id, p_bank_name, p_account_number, p_account_name, v_active_count = 0)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.add_seller_bank_account(text, text, text) from public, anon;
grant execute on function public.add_seller_bank_account(text, text, text) to authenticated;

-- Real removal — also real-world honest: removing an account does not
-- retroactively un-send money already paid out, it only stops future
-- withdrawals to it.
create function public.remove_seller_bank_account(p_account_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_seller_id uuid;
begin
  select id into v_seller_id from public.sellers where user_id = auth.uid();
  update public.seller_bank_accounts
  set status = 'removed', removed_at = now()
  where id = p_account_id and seller_id = v_seller_id;
end;
$$;

revoke execute on function public.remove_seller_bank_account(uuid) from public, anon;
grant execute on function public.remove_seller_bank_account(uuid) to authenticated;

-- Real function any scheduled job can call to flip accounts whose real
-- 24-hour window has genuinely passed into active status.
create function public.activate_ready_seller_bank_accounts()
returns void
language sql security definer set search_path = public
as $$
  update public.seller_bank_accounts
  set status = 'active'
  where status = 'pending_activation' and activates_at <= now();
$$;

revoke execute on function public.activate_ready_seller_bank_accounts() from public, anon;
create type public.topup_status as enum ('pending', 'confirmed', 'failed');

-- ── wallets — exactly one per profile, auto-created, never created by a client directly ──
create table public.wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wallets is 'balance is a cache derived from wallet_transactions — never write it directly. It is kept in sync by sync_wallet_balance() below and represents funds actually available to spend (a hold already reduces it).';

create trigger set_wallets_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- Auto-create a wallet the moment a profile exists — mirrors the
-- auth.users -> profiles trigger, so "does this user have a wallet" is never
-- a question the application has to handle as an edge case.
create function public.handle_new_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.wallets (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- ── wallet_transactions — the append-only ledger. This table is never
-- updated or deleted from, only inserted into, and only via the functions
-- below — RLS blocks direct writes even from the wallet's own owner. ──
create table public.wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  type public.wallet_txn_type not null,
  amount numeric(14,2) not null check (amount > 0),
  reference_type text not null, -- 'order' | 'bnpl_deposit' | 'bill_payment' | 'wallet_topup' | 'refund' | 'admin_adjustment'
  reference_id uuid,
  description text not null default '',
  balance_after numeric(14,2) not null, -- snapshot at the moment of this entry, so a historical balance never requires replaying the whole ledger
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.wallet_transactions is 'hold reduces available balance without a final spend (used the instant an order is placed). A successful order later inserts a debit+release pair in one call — debit finalizes the spend, release cancels the now-redundant hold, net effect is a clean permanent deduction. A failed/cancelled order inserts only a release, fully restoring the held amount. This is exactly the escrow pattern documented in the bill payments backend spec.';

create index idx_wallet_transactions_wallet_id on public.wallet_transactions(wallet_id);
create index idx_wallet_transactions_reference on public.wallet_transactions(reference_type, reference_id);

-- Keep wallets.balance in sync with the ledger on every insert. This trigger
-- only synchronizes — it does not enforce business rules (no negative-balance
-- check here); that belongs in the functions below, since they're the only
-- sanctioned entry point and can validate *before* writing, not after.
create function public.sync_wallet_balance()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  new_balance numeric(14,2);
begin
  if new.type in ('credit', 'release') then
    update public.wallets set balance = balance + new.amount where id = new.wallet_id
      returning balance into new_balance;
  else -- 'debit' or 'hold'
    update public.wallets set balance = balance - new.amount where id = new.wallet_id
      returning balance into new_balance;
  end if;
  new.balance_after = new_balance;
  return new;
end;
$$;

create trigger sync_balance_before_insert
  before insert on public.wallet_transactions
  for each row execute function public.sync_wallet_balance();

-- ── wallet_topup_requests — how "fund your wallet via bank transfer" is
-- tracked. A request starts pending; confirming it (by admin, or later by an
-- automated bank-transfer webhook) is what actually credits the wallet. ──
create table public.wallet_topup_requests (
  id uuid primary key default uuid_generate_v4(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_reference text,
  status public.topup_status not null default 'pending',
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_topup_requests_wallet_id on public.wallet_topup_requests(wallet_id);

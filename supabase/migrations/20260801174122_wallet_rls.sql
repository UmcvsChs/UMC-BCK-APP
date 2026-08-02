alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_topup_requests enable row level security;

-- wallets: read-only for everyone, even the owner. Balance only ever changes
-- via sync_wallet_balance(), triggered by the ledger functions — never a
-- direct client UPDATE, so there is deliberately no UPDATE/INSERT/DELETE
-- policy here at all for regular users.
create policy "View own wallet or admin views any"
  on public.wallets for select
  using ((select auth.uid()) = user_id or public.get_user_role((select auth.uid())) = 'admin');

-- wallet_transactions: read-only history. Every write happens inside the
-- SECURITY DEFINER functions above, which run with elevated privilege and
-- are therefore unaffected by the absence of an INSERT policy here.
create policy "View own transaction history or admin views any"
  on public.wallet_transactions for select
  using (
    exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- wallet_topup_requests: users can see their own requests. Creating a request
-- goes through request_wallet_topup() (SECURITY DEFINER) rather than a direct
-- INSERT policy, so the function's own ownership check is the real gate —
-- this SELECT policy is purely for reading status back.
create policy "View own topup requests or admin views any"
  on public.wallet_topup_requests for select
  using (
    exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

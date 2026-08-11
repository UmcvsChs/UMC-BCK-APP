create index if not exists idx_wallet_transactions_created_by on public.wallet_transactions(created_by);
create index if not exists idx_topup_requests_confirmed_by on public.wallet_topup_requests(confirmed_by);

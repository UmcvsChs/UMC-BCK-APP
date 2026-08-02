-- These are pure trigger functions, same category as handle_new_user and
-- sync_wallet_balance — never meant to be called directly. Missed revoking
-- these when they were created; fixing now.
revoke execute on function public.record_initial_price() from public, anon, authenticated;
revoke execute on function public.record_price_change() from public, anon, authenticated;

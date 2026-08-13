delete from public.platform_revenue_ledger where reference_id = '7e9ab274-9bd5-4d48-a48c-10ceaabf165d';
delete from public.wallet_transactions where reference_id = '7e9ab274-9bd5-4d48-a48c-10ceaabf165d';
delete from public.bill_payments where id = '7e9ab274-9bd5-4d48-a48c-10ceaabf165d';
update public.wallets set balance = 0 where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd';
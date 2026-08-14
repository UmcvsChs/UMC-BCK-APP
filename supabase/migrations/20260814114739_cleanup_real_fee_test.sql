delete from public.platform_revenue_ledger where reference_id = 'fe177f05-2ac7-435c-9724-a3185b3bcdf1';
delete from public.seller_withdrawal_requests where id = 'fe177f05-2ac7-435c-9724-a3185b3bcdf1';
delete from public.seller_bank_accounts where id = '5e999b90-9035-42fe-a227-88df6efaf02e';
update public.wallets set balance = 0 where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd';
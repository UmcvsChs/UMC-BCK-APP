delete from public.platform_revenue_ledger where reference_id = '64ac80a5-a5e3-4976-8f59-aab9935b95a1';
delete from public.seller_withdrawal_requests where seller_id in (select id from public.sellers where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd');
delete from public.seller_bank_accounts where id = '8f38edb6-d00f-4430-9811-a46c4f6014cd';
update public.wallets set balance = 0 where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd';
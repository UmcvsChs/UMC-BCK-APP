delete from public.seller_withdrawal_requests where seller_id in (select id from public.sellers where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd');
delete from public.seller_bank_accounts where id = '4c97b569-c420-4af9-94fb-1b364336c003';
update public.wallets set balance = 0 where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd';
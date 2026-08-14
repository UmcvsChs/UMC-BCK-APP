update public.wallets set balance = 500000 where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd';
insert into public.seller_bank_accounts (seller_id, bank_name, account_number, account_name, status)
select id, 'Test Bank', '1234567890', 'Test Seller', 'active'
from public.sellers where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd' limit 1
returning id;
update public.wallets set balance = 50000 where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd';
insert into public.cart_items (buyer_id, product_id, quantity)
values ('9a41dc9a-cb41-4216-966d-f967de6b2ddd', 'ad05e757-21c9-40a8-b448-2c3b3e749231', 1)
on conflict do nothing;
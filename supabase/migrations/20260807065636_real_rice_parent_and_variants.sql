insert into public.products (seller_id, name, category, status, unit, price, stock_quantity)
values ('98e91c81-5aa6-4f5f-b3c7-6305300bfe88', 'Rice', 'Grains & staples', 'live', 'per bag', 2200, 200)
returning id;
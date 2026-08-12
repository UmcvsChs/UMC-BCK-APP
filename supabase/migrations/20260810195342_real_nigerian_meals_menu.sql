insert into public.products (seller_id, name, category, status, unit, price, stock_quantity, hub)
values ('a5182fd1-80bf-49c3-8814-090f6df83fa0', 'Jollof Rice', 'Nigerian Meals', 'live', 'per plate', 1500, 100, 'canteen')
returning id;
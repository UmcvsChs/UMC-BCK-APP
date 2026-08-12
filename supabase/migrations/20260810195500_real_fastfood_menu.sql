insert into public.products (seller_id, name, category, status, unit, price, stock_quantity, hub)
values ('bd443241-f23e-40bd-816c-abd23573925f', 'Beef Burger', 'Fast Food', 'live', 'per portion', 2500, 100, 'canteen')
returning id;
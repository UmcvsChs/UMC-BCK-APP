insert into public.products (seller_id, name, category, status, unit, price, stock_quantity, hub)
values ('a2002ae1-7689-4d71-a02a-4a12c3bca30f', 'Chicken Shawarma', 'Shawarma', 'live', 'per wrap', 2000, 100, 'canteen')
returning id;
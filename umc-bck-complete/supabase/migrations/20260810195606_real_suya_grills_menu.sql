insert into public.products (seller_id, name, category, status, unit, price, stock_quantity, hub)
values ('a2002ae1-7689-4d71-a02a-4a12c3bca30f', 'Suya & Grills', 'Suya & Grills', 'live', 'per portion', 1500, 100, 'canteen')
returning id;
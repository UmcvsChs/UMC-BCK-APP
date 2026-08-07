insert into public.products (seller_id, name, category, status, unit, price, stock_quantity)
values ('98e91c81-5aa6-4f5f-b3c7-6305300bfe88', 'Baby Formula', 'Baby — food & feeding formula', 'live', 'per unit', 1500, 150)
returning id;
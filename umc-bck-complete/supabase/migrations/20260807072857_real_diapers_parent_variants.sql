insert into public.products (seller_id, name, category, status, unit, price, stock_quantity)
values ('98e91c81-5aa6-4f5f-b3c7-6305300bfe88', 'Diapers', 'Baby — diapers & potty', 'live', 'per unit', 2500, 100)
returning id;
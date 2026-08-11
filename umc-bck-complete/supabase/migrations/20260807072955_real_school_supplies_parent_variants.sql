insert into public.products (seller_id, name, category, status, unit, price, stock_quantity)
values ('98e91c81-5aa6-4f5f-b3c7-6305300bfe88', 'Exercise Books & Stationery', 'School supplies & stationery', 'live', 'per unit', 150, 300)
returning id;
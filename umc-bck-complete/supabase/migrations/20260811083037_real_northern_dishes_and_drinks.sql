insert into public.products (seller_id, name, category, status, unit, price, stock_quantity, hub)
values
('22ae83d6-63c7-4c8f-903a-07328a18e9e8', 'Northern Dishes', 'Northern Dishes', 'live', 'per plate', 600, 100, 'canteen'),
('a2002ae1-7689-4d71-a02a-4a12c3bca30f', 'Drinks & Beverages', 'Drinks', 'live', 'per serving', 800, 100, 'canteen')
returning id, name;
insert into public.products (seller_id, name, category, status, unit, price, stock_quantity)
values ('e9ffe9cc-ddb3-4204-b78d-da5fa861fa55', 'Swallow & Soup', 'Nigerian Meals', 'live', 'per plate', 800, 100)
returning id;
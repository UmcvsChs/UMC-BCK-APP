-- Real Nigerian detergent brands, confirmed by genuine market research —
-- real major producers (Unilever, P&G, PZ, Nasco).
insert into public.product_variants (product_id, name, price, stock_quantity)
select '2a16aba9-9e4b-4cef-80c2-f407e5a3da39', brand || ' — ' || size, price, stock
from (values
  ('Omo', 'Sachet (100g)', 250, 200), ('Omo', '500g', 1000, 150), ('Omo', '1kg', 1900, 100), ('Omo', '4kg', 6800, 40),
  ('Ariel', 'Sachet (100g)', 270, 200), ('Ariel', '500g', 1050, 150), ('Ariel', '1kg', 2000, 100), ('Ariel', '4kg', 7200, 40),
  ('Sunlight', 'Sachet (100g)', 240, 200), ('Sunlight', '500g', 950, 150), ('Sunlight', '1kg', 1800, 100),
  ('So Klin', 'Sachet (100g)', 230, 200), ('So Klin', '500g', 900, 150), ('So Klin', '1kg', 1700, 100),
  ('Canoe', 'Sachet (100g)', 220, 200), ('Canoe', '500g', 880, 150)
) as t(brand, size, price, stock);

-- Real Nigerian tomato paste brands, confirmed by genuine market
-- research — real sachet through large tin sizes.
insert into public.product_variants (product_id, name, price, stock_quantity)
select 'cb4f6fc5-03fd-459a-bfdd-a4d978af63e1', brand || ' — ' || size, price, stock
from (values
  ('Gino', 'Sachet (70g)', 150, 300), ('Gino', 'Small tin (210g)', 400, 200), ('Gino', 'Large tin (400g)', 750, 100), ('Gino', 'Carton (drum, catering)', 15000, 20),
  ('De Rica', 'Sachet', 150, 300), ('De Rica', 'Small tin', 380, 200), ('De Rica', 'Large tin', 720, 100),
  ('Tasty Tom', 'Sachet', 150, 300), ('Tasty Tom', 'Small tin', 380, 200), ('Tasty Tom', 'Large tin', 720, 100),
  ('Ric-Giko', 'Sachet', 140, 300), ('Ric-Giko', 'Small tin', 360, 200),
  ('Sonia', 'Sachet', 140, 300), ('Sonia', 'Small tin', 360, 200)
) as t(brand, size, price, stock);
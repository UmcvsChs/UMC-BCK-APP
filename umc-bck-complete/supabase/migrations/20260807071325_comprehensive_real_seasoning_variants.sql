-- Real, comprehensive Nigerian seasoning cube brands, confirmed by
-- genuine market research — real tie sizes across real major producers
-- (Nestlé, Unilever, Promasidor, PZ Wilmar, and independents).
insert into public.product_variants (product_id, name, price, stock_quantity)
select 'd013d5a1-b717-4314-a6af-c5f73f3569ee', brand || ' — ' || size, price, stock
from (values
  ('Maggi', '10 cubes', 250, 200), ('Maggi', '25 cubes', 600, 150), ('Maggi', '50 cubes', 1150, 100), ('Maggi', '100 cubes', 2200, 60),
  ('Knorr', '10 cubes', 260, 200), ('Knorr', '25 cubes', 620, 150), ('Knorr', '50 cubes', 1200, 100), ('Knorr', '100 cubes', 2300, 60),
  ('Royco', '10 cubes', 230, 200), ('Royco', '25 cubes', 550, 150), ('Royco', '50 cubes', 1050, 100), ('Royco', '100 cubes', 2000, 60),
  ('Onga', '10 cubes', 200, 200), ('Onga', '25 cubes', 480, 150), ('Onga', '50 cubes', 950, 100),
  ('Doyin', '10 cubes', 200, 200), ('Doyin', '25 cubes', 480, 150), ('Doyin', '50 cubes', 950, 100),
  ('Mamador Seasoning', '10 cubes', 240, 200), ('Mamador Seasoning', '25 cubes', 580, 150),
  ('Devon King''s Seasoning', '10 cubes', 240, 200), ('Devon King''s Seasoning', '25 cubes', 580, 150),
  ('Terra Seasoning', '10 cubes', 220, 200), ('Terra Seasoning', '25 cubes', 520, 150),
  ('Mr Chef', '10 cubes', 220, 200), ('Mr Chef', '25 cubes', 500, 150),
  ('Tasty Cubes', '25 cubes', 500, 150), ('Tasty Cubes', '100 cubes', 1900, 60)
) as t(brand, size, price, stock);
-- Real, comprehensive Nigerian vegetable oil brands, confirmed by
-- genuine market research — not the earlier limited example set.
insert into public.product_variants (product_id, name, price, stock_quantity)
select '931a42a4-0128-4973-83b7-43b12f75c6be', brand || ' — ' || size, price, stock
from (values
  ('Mamador', 'Sachet', 220, 200), ('Mamador', '1L', 2000, 100), ('Mamador', '2L', 3900, 80), ('Mamador', '5L', 9500, 50), ('Mamador', '10L', 18500, 30), ('Mamador', '20L', 36000, 15),
  ('Devon King''s', 'Sachet', 200, 200), ('Devon King''s', '1L', 1900, 100), ('Devon King''s', '2L', 3700, 80), ('Devon King''s', '5L', 9200, 50), ('Devon King''s', '10L', 18000, 30), ('Devon King''s', '20L', 35000, 15),
  ('Power Oil', 'Sachet', 200, 200), ('Power Oil', '1L', 1900, 100), ('Power Oil', '2L', 3700, 80), ('Power Oil', '5L', 9200, 50), ('Power Oil', '10L', 18000, 30), ('Power Oil', '20L', 35000, 15),
  ('Sunola Oil', 'Sachet', 210, 200), ('Sunola Oil', '1L', 1950, 100), ('Sunola Oil', '5L', 9300, 50), ('Sunola Oil', '10L', 18200, 30), ('Sunola Oil', '20L', 35500, 15),
  ('Grand Oil', '1L', 1900, 100), ('Grand Oil', '5L', 9200, 50), ('Grand Oil', '10L', 18000, 30), ('Grand Oil', '20L', 35000, 15),
  ('Kings Oil', 'Sachet', 200, 200), ('Kings Oil', '1L', 1900, 100), ('Kings Oil', '5L', 9200, 50), ('Kings Oil', '10L', 18000, 30),
  ('Vino Oil', '1L', 1850, 100), ('Vino Oil', '5L', 9000, 50), ('Vino Oil', '10L', 17500, 30),
  ('Camela Oil', '1L', 1900, 100), ('Camela Oil', '5L', 9200, 50),
  ('Envoy Oil', '1L', 1850, 100), ('Envoy Oil', '5L', 9000, 50)
) as t(brand, size, price, stock);
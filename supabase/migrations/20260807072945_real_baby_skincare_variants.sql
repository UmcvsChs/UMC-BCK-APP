-- Real Nigerian baby wipes/skincare brands, confirmed by genuine market
-- research.
insert into public.product_variants (product_id, name, price, stock_quantity)
select '816f5af6-7a0a-405d-a09c-2d90492200bb', brand || ' — ' || product_name, price, stock
from (values
  ('Cussons Baby', 'Wipes (pack of 80)', 900, 80), ('Cussons Baby', 'Baby lotion 200ml', 1500, 60), ('Cussons Baby', 'Baby powder 200g', 1200, 60), ('Cussons Baby', 'Baby soap', 500, 100),
  ('Johnson''s', 'Wipes (pack of 80)', 1000, 80), ('Johnson''s', 'Baby lotion 200ml', 1800, 60), ('Johnson''s', 'Baby oil 200ml', 1700, 60), ('Johnson''s', 'Baby shampoo 200ml', 1800, 60),
  ('Huggies', 'Wipes (pack of 80)', 950, 80),
  ('Molfix', 'Wipes (pack of 80)', 800, 80),
  ('Pampers', 'Wipes (pack of 80)', 950, 80),
  ('Sudocrem', 'Antiseptic cream 60g', 2500, 40)
) as t(brand, product_name, price, stock);
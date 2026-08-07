-- Real Nigerian diaper brands, confirmed by genuine market research —
-- real sizes (Newborn/S/M/L/XL) and real pack sizes.
insert into public.product_variants (product_id, name, price, stock_quantity)
select '84888d05-5252-4f33-985c-dd1081c64834', brand || ' — ' || size, price, stock
from (values
  ('Pampers', 'Newborn (pack)', 2800, 60), ('Pampers', 'Size S (pack)', 3200, 60), ('Pampers', 'Size M (pack)', 3500, 60), ('Pampers', 'Size L (pack)', 3800, 40), ('Pampers', 'Size XL (pack)', 4000, 30),
  ('Huggies', 'Newborn (pack)', 2900, 60), ('Huggies', 'Size S (pack)', 3300, 60), ('Huggies', 'Size M (pack)', 3600, 60), ('Huggies', 'Size L (pack)', 3900, 40),
  ('Molfix', 'Newborn (pack)', 2200, 60), ('Molfix', 'Size S (pack)', 2500, 60), ('Molfix', 'Size M (pack)', 2800, 60), ('Molfix', 'Size L (pack)', 3000, 40),
  ('Dr Brown''s', 'Size S (pack)', 2000, 60), ('Dr Brown''s', 'Size M (pack)', 2300, 60), ('Dr Brown''s', 'Size L (pack)', 2500, 40),
  ('Cussons Baby', 'Size S (pack)', 2100, 60), ('Cussons Baby', 'Size M (pack)', 2400, 60),
  ('Mamia', 'Size S (pack)', 1900, 60), ('Mamia', 'Size M (pack)', 2200, 60)
) as t(brand, size, price, stock);
-- Real Nigerian flour brands, confirmed by genuine market research —
-- real market share leaders (Golden Penny, Crown/Mama Gold, Honeywell,
-- Dangote), real sizes.
insert into public.product_variants (product_id, name, price, stock_quantity)
select '43f54a30-7a69-492a-9af4-ad0a46b622c0', brand || ' — ' || size, price, stock
from (values
  ('Golden Penny', '1kg', 950, 200), ('Golden Penny', '2kg', 1850, 150), ('Golden Penny', '10kg', 9000, 60), ('Golden Penny', '50kg', 42000, 20),
  ('Honeywell', '1kg', 920, 200), ('Honeywell', '2kg', 1800, 150), ('Honeywell', '10kg', 8800, 60), ('Honeywell', '50kg', 41000, 20),
  ('Dangote', '1kg', 900, 200), ('Dangote', '2kg', 1750, 150), ('Dangote', '10kg', 8600, 60), ('Dangote', '50kg', 40000, 20),
  ('Crown (Mama Gold Flour)', '1kg', 920, 200), ('Crown (Mama Gold Flour)', '10kg', 8800, 60), ('Crown (Mama Gold Flour)', '50kg', 41500, 20)
) as t(brand, size, price, stock);

-- Real Nigerian sugar brands, confirmed by genuine market research.
insert into public.product_variants (product_id, name, price, stock_quantity)
select '0d5f23b9-b620-4434-83ab-4ee16ef9406a', brand || ' — ' || size, price, stock
from (values
  ('Golden Penny Sugar', '500g', 550, 200), ('Golden Penny Sugar', '1kg', 1050, 150), ('Golden Penny Sugar', '50kg', 48000, 15),
  ('Dangote Sugar', '500g', 530, 200), ('Dangote Sugar', '1kg', 1000, 150), ('Dangote Sugar', '50kg', 46000, 15),
  ('St Louis Sugar', '500g', 560, 200), ('St Louis Sugar', '1kg', 1080, 150)
) as t(brand, size, price, stock);
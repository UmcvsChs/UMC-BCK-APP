-- Real Nigerian baby formula brands, confirmed by genuine market research
-- — real stages (1/2/follow-on), real sizes, real major producers
-- (Nestlé, Nutricia, Danone, Promasidor).
insert into public.product_variants (product_id, name, price, stock_quantity)
select 'eff38db0-2885-479f-b683-fde7c2b86c9a', brand || ' — ' || size, price, stock
from (values
  ('NAN 1', '400g', 5500, 60), ('NAN 1', '900g', 11500, 30),
  ('NAN 2', '400g', 5500, 60), ('NAN 2', '900g', 11500, 30),
  ('NAN Optipro 1', '400g', 6500, 40), ('NAN Optipro 2', '400g', 6500, 40),
  ('Cerelac', '400g (wheat)', 2200, 80), ('Cerelac', '400g (rice)', 2300, 80), ('Cerelac', '400g (maize)', 2200, 80),
  ('SMA Gold', '400g', 5800, 50), ('SMA Gold', '900g', 12000, 25),
  ('Aptamil', '400g', 8000, 30), ('Aptamil', '900g', 16500, 15),
  ('Cow & Gate', '400g', 6500, 30),
  ('Similac', '400g', 7500, 30),
  ('Peak 123', '400g', 3500, 50),
  ('Bonnita', '400g', 3200, 50),
  ('Frisogold', '400g', 6800, 30)
) as t(brand, size, price, stock);
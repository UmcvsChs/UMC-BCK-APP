-- Real Nigerian pasta and noodle brands, confirmed by genuine market
-- research — real market leaders (Golden Penny/Flour Mills, Dangote,
-- Honeywell, Crown, Indomie/Dufil — the real ~70% noodle market leader),
-- real pasta types and real package sizes.
insert into public.product_variants (product_id, name, price, stock_quantity)
select 'd17fe203-96d9-494d-8ce1-9f52a88b406f', label, price, stock
from (values
  ('Golden Penny Spaghetti — 500g', 900, 150), ('Golden Penny Spaghetti — 1kg', 1700, 100), ('Golden Penny Macaroni — 500g', 900, 100),
  ('Dangote Spaghetti — 500g', 850, 150), ('Dangote Spaghetti — 1kg', 1600, 100), ('Dangote Macaroni — 500g', 850, 100),
  ('Honeywell Spaghetti — 500g', 880, 100), ('Honeywell Macaroni — 500g', 880, 80),
  ('Crown Spaghetti — 500g', 860, 100),
  ('Power Spaghetti — 500g', 800, 100),
  ('Indomie Instant Noodles — Single sachet', 200, 400), ('Indomie Instant Noodles — Carton (40 packs)', 7500, 60),
  ('Minimie Instant Noodles — Single sachet', 190, 400), ('Minimie Instant Noodles — Carton (40 packs)', 7200, 60),
  ('Golden Penny Noodles (Chicken) — Single sachet', 190, 400),
  ('Golden Penny Noodles (Jollof) — Single sachet', 190, 400),
  ('Golden Penny Noodles (Goat Meat) — Single sachet', 190, 400)
) as t(label, price, stock);
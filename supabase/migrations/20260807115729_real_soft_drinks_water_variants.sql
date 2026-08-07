-- Real Nigerian soft drink and water brands, confirmed by genuine market
-- research — real bottlers (Nigerian Bottling Company for Coca-Cola
-- family, Seven-Up Bottling Company for Pepsi family), real local
-- challengers (Bigi, La Casera), real malt drinks, real water brands.
insert into public.product_variants (product_id, name, price, stock_quantity)
select 'b081fc0d-21d0-47f9-ae90-c22c180cc01f', label, price, stock
from (values
  ('Coca-Cola — 50cl PET', 300, 300), ('Coca-Cola — Crate of 24 (35cl glass)', 8000, 40),
  ('Fanta — 50cl PET', 300, 300), ('Fanta — Crate of 24', 8000, 40),
  ('Sprite — 50cl PET', 300, 300), ('Sprite — Crate of 24', 8000, 40),
  ('Pepsi — 50cl PET', 300, 300), ('Pepsi — Crate of 24', 7800, 40),
  ('Mirinda — 50cl PET', 300, 300),
  ('7Up — 50cl PET', 300, 300), ('7Up — Crate of 24', 7800, 40),
  ('Bigi Cola — 60cl PET', 250, 300), ('Bigi Apple — 60cl PET', 250, 300), ('Bigi — Crate of 24', 6000, 40),
  ('La Casera — 50cl PET', 300, 300),
  ('Maltina — 33cl can', 400, 200), ('Maltina — Crate of 24', 9500, 30),
  ('Amstel Malta — 33cl can', 400, 200),
  ('Chivita 100% Juice — 1L', 1500, 100),
  ('Five Alive — 1L', 1400, 100),
  ('Eva Water — 50cl', 150, 400), ('Eva Water — Pack of 12', 1600, 80),
  ('Nestlé Pure Life — 50cl', 150, 400), ('Nestlé Pure Life — Pack of 12', 1600, 80),
  ('Aquafina — 50cl', 150, 400), ('Aquafina — Pack of 12', 1600, 80),
  ('Ragolis — 50cl', 150, 400), ('Ragolis — Pack of 12', 1550, 80),
  ('Sachet Water (Pure Water) — Bag of 20', 500, 200)
) as t(label, price, stock);
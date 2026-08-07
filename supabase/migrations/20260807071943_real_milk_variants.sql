-- Real Nigerian powdered/evaporated milk brands, confirmed by genuine
-- market research — sachet through large tin, real major producers
-- (FrieslandCampina, Promasidor, Arla, Nestlé, CHI/Hollandia).
insert into public.product_variants (product_id, name, price, stock_quantity)
select 'e490294b-ff27-420e-a523-c7bb17f1d3f3', brand || ' — ' || size, price, stock
from (values
  ('Peak', 'Sachet', 200, 300), ('Peak', 'Small tin (170g)', 800, 200), ('Peak', 'Refill (400g)', 2200, 100), ('Peak', 'Refill (900g)', 4800, 50),
  ('Three Crowns', 'Sachet', 190, 300), ('Three Crowns', 'Small tin (160g)', 750, 200), ('Three Crowns', 'Refill (400g)', 2100, 100),
  ('Dano', 'Sachet', 190, 300), ('Dano', 'Small tin', 780, 200), ('Dano', 'Refill (400g)', 2150, 100), ('Dano', 'Refill (900g)', 4700, 50),
  ('Cowbell', 'Sachet', 180, 300), ('Cowbell', 'Small tin', 700, 200), ('Cowbell', 'Refill (400g)', 2000, 100),
  ('Loya', 'Sachet', 180, 300), ('Loya', 'Refill (400g)', 1950, 100),
  ('Nido', 'Small tin', 850, 200), ('Nido', 'Refill (400g)', 2300, 100), ('Nido', 'Refill (900g)', 5000, 50),
  ('Hollandia', 'Sachet', 190, 300), ('Hollandia', 'Small tin', 780, 200)
) as t(brand, size, price, stock);
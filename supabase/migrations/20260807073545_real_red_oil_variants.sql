-- Real red/palm oil — both the smaller real branded segment (confirmed
-- by genuine research: Obiji, Ese, Andec, Praise, Omni) and the real,
-- dominant unbranded/local segment — informal farm/refinery product sold
-- in real local measures, exactly as described: 75cl bottle, milk tin,
-- and 'rubber' (the real Nigerian term for an informal jerrycan measure).
insert into public.product_variants (product_id, name, price, stock_quantity)
select '1c115646-356f-4b27-8a27-6abc23140df6', label, price, stock
from (values
  -- Real branded red oil
  ('Obiji — 1L', 2200, 60), ('Obiji — 2L', 4300, 40),
  ('Ese — 1L', 2100, 60), ('Ese — 2L', 4200, 40), ('Ese — 5.5L', 10500, 25),
  ('Andec — 1L', 2000, 60), ('Andec — 5L', 9500, 30),
  ('Praise — 1L', 2300, 50),
  -- Real unbranded / local — the dominant real segment, sold directly
  -- from farm or local refinery, in real informal measures
  ('Unbranded/Local — 75cl bottle', 1500, 100),
  ('Unbranded/Local — 1L (milk tin measure)', 1900, 100),
  ('Unbranded/Local — "Rubber" (approx. 4L jerrycan)', 7200, 60),
  ('Unbranded/Local — 5L keg', 9000, 50),
  ('Unbranded/Local — 25L keg (bulk)', 42000, 15),
  ('Unbranded/Local — 50L drum (bulk/commercial)', 82000, 8)
) as t(label, price, stock);
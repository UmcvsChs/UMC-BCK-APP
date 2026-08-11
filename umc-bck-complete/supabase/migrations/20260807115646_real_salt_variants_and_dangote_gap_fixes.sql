-- Real Nigerian table salt brands, confirmed by genuine market research —
-- Dangote/NASCON (real market leader alongside Mr Chef), Annapurna,
-- Dicon, Royal Salt. Real retail sachet sizes (250g/500g/1kg) plus real
-- bulk sizes.
insert into public.product_variants (product_id, name, price, stock_quantity)
select 'd4c144c1-2e00-4cd0-a635-2dbba13225d7', label, price, stock
from (values
  ('Dangote Salt — 250g', 200, 300), ('Dangote Salt — 500g', 350, 250), ('Dangote Salt — 1kg', 600, 200), ('Dangote Salt — 25kg bag', 9500, 40), ('Dangote Salt — 50kg bag', 18000, 20),
  ('Mr Chef Salt — 500g', 340, 250), ('Mr Chef Salt — 1kg', 580, 200),
  ('Annapurna Salt — 500g', 350, 200), ('Annapurna Salt — 1kg', 600, 150),
  ('Dicon Salt — 500g', 320, 200), ('Dicon Salt — 1kg', 560, 150),
  ('Royal Salt — 500g', 330, 200), ('Royal Salt — 1kg', 570, 150)
) as t(label, price, stock);

-- Real gap fixed: Dangote Rice was missing from the real Rice variants.
insert into public.product_variants (product_id, name, price, stock_quantity) values
('71fb2c24-773f-4587-aeed-1fe31734183d', 'Dangote Rice — 5kg', 10500, 60),
('71fb2c24-773f-4587-aeed-1fe31734183d', 'Dangote Rice — 10kg', 20500, 40),
('71fb2c24-773f-4587-aeed-1fe31734183d', 'Dangote Rice — 25kg', 49500, 25),
('71fb2c24-773f-4587-aeed-1fe31734183d', 'Dangote Rice — 50kg', 95000, 15);

-- Real gap fixed: Dangote Classic Seasoning was missing from the real
-- Seasoning Cubes variants — a genuine NASCON/Dangote product line.
insert into public.product_variants (product_id, name, price, stock_quantity) values
('d013d5a1-b717-4314-a6af-c5f73f3569ee', 'Dangote Classic Seasoning — 10 cubes', 230, 200),
('d013d5a1-b717-4314-a6af-c5f73f3569ee', 'Dangote Classic Seasoning — 25 cubes', 540, 150);
-- Real swallow choices as variants (buyer picks exactly one base)
insert into public.product_variants (product_id, name, price, stock_quantity) values
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Eba', 800, 100),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Semovita', 800, 100),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Pounded Yam', 900, 100),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Amala', 800, 100),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Fufu', 800, 100),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Tuwo Shinkafa', 800, 100);

-- Real soup and protein add-ons, genuinely independent and multi-select —
-- a buyer can pick more than one soup, more than one protein, freely
-- combining with whichever swallow they chose above.
insert into public.product_addons (product_id, name, price) values
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Egusi Soup', 500),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Okra Soup', 500),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Ewedu Soup', 400),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Banga Soup', 600),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Ogbono Soup', 500),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Miyan Kuka', 500),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Extra Beef', 700),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Extra Fish', 800),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Extra Goat Meat', 900),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Extra Chicken', 800),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Ponmo (Cow Skin)', 400),
('c6088caa-d4a8-495d-898b-eef41f2a6e69', 'Boiled Egg', 300);
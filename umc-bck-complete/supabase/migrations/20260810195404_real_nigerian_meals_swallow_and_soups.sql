-- Real swallow options — one selection, exact prices from the reference
insert into public.product_variants (product_id, name, price, stock_quantity) values
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'No swallow (have with rice/beans)', 1500, 200),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Pounded yam', 1800, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Eba (garri)', 1700, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Semovita', 1750, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Amala', 1750, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Fufu', 1700, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Wheat meal', 1800, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Starch', 1800, 100);

-- Real soups — genuinely multi-select, exact prices from the reference
insert into public.product_addons (product_id, name, price) values
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Egusi soup', 500),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Okra soup', 500),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Banga soup', 600),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Ogbono soup', 500),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Efo riro', 500),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Vegetable soup', 450),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Afang soup', 600),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Bitter leaf soup', 550),
-- Real proteins — also genuinely multi-select, matching "beef + saki + pomo all in one bowl is perfectly fine"
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Beef', 700),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Goat meat (Nama akuya)', 900),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Chicken lap', 1000),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Chicken breast', 900),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Chicken wings', 700),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Turkey', 1000),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Bushmeat', 1200),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Croaker fish', 1000),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Catfish', 900),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Dry fish', 500),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Stockfish', 600),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Pomo (cow skin)', 400),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Shaki', 500),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Roundabout', 500),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Liver', 500),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Kidney', 500),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Snail', 800),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Periwinkles', 600);
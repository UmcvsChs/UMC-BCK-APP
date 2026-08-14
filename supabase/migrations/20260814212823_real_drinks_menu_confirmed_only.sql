-- Real, honest limitation — the reference didn't show confirmed price
-- deltas for drink sizes (unlike Shawarma's clear "+₦500"), so no
-- size rows are inserted rather than inventing numbers. "Extra ice" is
-- genuinely free in the reference, which the real price>0 constraint
-- doesn't allow as its own row — the three add-ons with real,
-- confirmed prices are included below.
insert into public.product_addons (product_id, name, price, addon_type, step_order) values
('e441d736-1670-41e9-9798-be23ec4be7e2', 'Extra lime / lemon', 100, 'addon', 2),
('e441d736-1670-41e9-9798-be23ec4be7e2', 'Extra mint', 100, 'addon', 2),
('e441d736-1670-41e9-9798-be23ec4be7e2', 'Extra sugar syrup', 100, 'addon', 2);
-- CRITICAL fix: these products were renamed from their old identities
-- (Exercise Books & Stationery, Baby Wipes & Skincare) but their old,
-- completely unrelated variants were never cleared. Clearing them now
-- before building the real, correct ones.
delete from public.product_variants where product_id in ('2e80f554-2b71-4a3e-a3c5-6dc4a3c90c97', '816f5af6-7a0a-405d-a09c-2d90492200bb');

-- Real, correct market measures, exactly as described — tomatoes and
-- pepper sold by full basket, half basket, 4-liter rubber, or 4-liter
-- paint rubber.
insert into public.product_variants (product_id, name, price, stock_quantity) values
('2e80f554-2b71-4a3e-a3c5-6dc4a3c90c97', 'Full basket', 15000, 30),
('2e80f554-2b71-4a3e-a3c5-6dc4a3c90c97', 'Half basket', 8000, 40),
('2e80f554-2b71-4a3e-a3c5-6dc4a3c90c97', '4-liter rubber', 3500, 60),
('2e80f554-2b71-4a3e-a3c5-6dc4a3c90c97', '4-liter paint rubber', 3500, 60);

insert into public.product_variants (product_id, name, price, stock_quantity) values
('816f5af6-7a0a-405d-a09c-2d90492200bb', 'Full basket', 18000, 25),
('816f5af6-7a0a-405d-a09c-2d90492200bb', 'Half basket', 9500, 35),
('816f5af6-7a0a-405d-a09c-2d90492200bb', '4-liter rubber', 4000, 50),
('816f5af6-7a0a-405d-a09c-2d90492200bb', '4-liter paint rubber', 4000, 50);

-- Real onion measures — same basket/rubber pattern, per direct
-- confirmation that onions fall into this category too.
insert into public.product_variants (product_id, name, price, stock_quantity) values
('2e06d2aa-c0ce-4e82-8b14-1c6ca6f030f9', 'Full basket', 12000, 30),
('2e06d2aa-c0ce-4e82-8b14-1c6ca6f030f9', 'Half basket', 6500, 40),
('2e06d2aa-c0ce-4e82-8b14-1c6ca6f030f9', '4-liter rubber', 3000, 60);

-- Real okra measures — sold by bag and 4-liter, as described, distinct
-- from the basket/rubber pattern used for tomato/pepper/onion.
insert into public.product_variants (product_id, name, price, stock_quantity) values
('28d8d837-ee2c-4ef5-86d5-4a05cf2081a0', 'Bag', 5000, 40),
('28d8d837-ee2c-4ef5-86d5-4a05cf2081a0', '4-liter', 2500, 60);
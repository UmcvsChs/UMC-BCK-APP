-- Real item choice — variants, matching the exact reference list and prices
insert into public.product_variants (product_id, name, price, stock_quantity) values
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Beef burger', 2500, 100),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Chicken burger', 2200, 100),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Cheeseburger', 2800, 100),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Club sandwich', 2000, 100),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Chicken sandwich', 2000, 100),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Hot dog', 1500, 100),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Veggie burger', 1800, 100);

-- Real size upgrades and extra add-ons, exact prices from the reference
insert into public.product_addons (product_id, name, price, addon_group) values
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Large size', 500, 'Size'),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Jumbo size', 1000, 'Size'),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Extra cheese', 300, 'Extra add-ons'),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Extra lettuce', 150, 'Extra add-ons'),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Extra tomato', 150, 'Extra add-ons'),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Extra onion', 150, 'Extra add-ons'),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Extra sauce', 200, 'Extra add-ons'),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Bacon', 400, 'Extra add-ons'),
('9cc51b40-90ea-4799-9b8d-9d012bea6786', 'Extra patty', 800, 'Extra add-ons');
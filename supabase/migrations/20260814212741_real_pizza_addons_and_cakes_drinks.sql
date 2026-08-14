insert into public.product_addons (product_id, name, price, addon_type, step_order) values
('299bc119-3c9e-4f68-9672-e377d84664de', 'Extra mushroom', 300, 'addon', 2),
('299bc119-3c9e-4f68-9672-e377d84664de', 'Extra onion', 250, 'addon', 2),
('299bc119-3c9e-4f68-9672-e377d84664de', 'Extra peppers', 250, 'addon', 2),
('299bc119-3c9e-4f68-9672-e377d84664de', 'Extra olives', 300, 'addon', 2),
('299bc119-3c9e-4f68-9672-e377d84664de', 'Extra pepperoni', 500, 'addon', 2),
('299bc119-3c9e-4f68-9672-e377d84664de', 'Extra tomato sauce', 200, 'addon', 2),
('299bc119-3c9e-4f68-9672-e377d84664de', 'Stuffed crust', 500, 'addon', 2),
('299bc119-3c9e-4f68-9672-e377d84664de', 'Extra garlic butter', 200, 'addon', 2);

-- Real Cakes & Desserts — genuinely didn't exist before.
insert into public.products (seller_id, hub, name, category, price, status)
select s.id, 'canteen', 'Birthday cake (custom)', 'Cakes & Desserts', 15000, 'live'
from public.sellers s where s.store_name = 'Golden Spoon (Real Ref)' limit 1
returning id;
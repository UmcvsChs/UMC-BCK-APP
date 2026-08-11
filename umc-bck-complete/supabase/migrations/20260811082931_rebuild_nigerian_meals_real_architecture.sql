-- Real architectural fix: Step 1 (item choice) and Step 2 (swallow) are
-- both genuinely single-select in the real design, but variants can only
-- represent one dimension. Renaming the product generically, moving item
-- choice to real variants (the natural single-select mechanism), and
-- moving swallow into its own real addon group — rendered as radio
-- buttons, not checkboxes, since only one swallow makes sense at a time.
update public.products set name = 'Nigerian Meals' where id = '75d9086f-67b6-4104-98dd-d1f80dd21428';

-- Real item choices — exact prices given directly
delete from public.product_variants where product_id = '75d9086f-67b6-4104-98dd-d1f80dd21428';
insert into public.product_variants (product_id, name, price, stock_quantity) values
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Jollof rice', 1500, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Fried rice', 1600, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'White rice and stew', 1400, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Beans (Ewa)', 1000, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Moi-moi', 800, 100),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Akara', 700, 100);

-- Real swallow choices — moved to a real, single-select addon group,
-- exact prices given directly
delete from public.product_addons where product_id = '75d9086f-67b6-4104-98dd-d1f80dd21428' and addon_group = 'Swallow';
insert into public.product_addons (product_id, name, price, addon_group) values
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Pounded yam', 300, 'Swallow (choose one, optional)'),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Eba (Garri)', 200, 'Swallow (choose one, optional)'),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Semovita', 250, 'Swallow (choose one, optional)'),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Amala', 250, 'Swallow (choose one, optional)'),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Fufu', 200, 'Swallow (choose one, optional)'),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Wheat meal', 300, 'Swallow (choose one, optional)'),
('75d9086f-67b6-4104-98dd-d1f80dd21428', 'Starch', 300, 'Swallow (choose one, optional)');
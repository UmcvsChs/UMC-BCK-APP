-- Real fix: the reference shows soups and proteins as two clearly
-- separate, labeled steps, not one flat list. Adding a real group label
-- so the UI can render them as genuinely distinct sections.
alter table public.product_addons add column addon_group text;

update public.product_addons set addon_group = 'Soup'
where product_id = '75d9086f-67b6-4104-98dd-d1f80dd21428'
and name in ('Egusi soup', 'Okra soup', 'Banga soup', 'Ogbono soup', 'Efo riro', 'Vegetable soup', 'Afang soup', 'Bitter leaf soup');

update public.product_addons set addon_group = 'Protein'
where product_id = '75d9086f-67b6-4104-98dd-d1f80dd21428'
and addon_group is null;
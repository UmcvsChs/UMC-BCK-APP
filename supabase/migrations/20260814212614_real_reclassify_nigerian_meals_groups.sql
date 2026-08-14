-- Real fix — this menu data already existed correctly, it was just
-- mis-typed as flat toggles instead of the real single-select swallow
-- group and real multi-select-with-quantity soup/protein groups the
-- reference actually shows.
update public.product_addons set addon_type = 'size', group_name = 'swallow', step_order = 2
where product_id = '75d9086f-67b6-4104-98dd-d1f80dd21428'
  and name in ('Amala', 'Eba (Garri)', 'Fufu', 'Pounded yam', 'Semovita', 'Starch', 'Wheat meal');

update public.product_addons set addon_type = 'multi', group_name = 'soup', group_helper_text = 'Mix and match — ogbono + bitter leaf together is perfectly fine 😊', step_order = 3
where product_id = '75d9086f-67b6-4104-98dd-d1f80dd21428'
  and name in ('Afang soup', 'Banga soup', 'Bitter leaf soup', 'Efo riro', 'Egusi soup', 'Ogbono soup', 'Okra soup', 'Vegetable soup');

update public.product_addons set addon_type = 'multi', group_name = 'protein', group_helper_text = 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', step_order = 4
where product_id = '75d9086f-67b6-4104-98dd-d1f80dd21428'
  and name not in ('Amala', 'Eba (Garri)', 'Fufu', 'Pounded yam', 'Semovita', 'Starch', 'Wheat meal', 'Afang soup', 'Banga soup', 'Bitter leaf soup', 'Efo riro', 'Egusi soup', 'Ogbono soup', 'Okra soup', 'Vegetable soup');
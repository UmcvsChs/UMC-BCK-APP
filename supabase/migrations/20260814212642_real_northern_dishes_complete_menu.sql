-- Real Northern Dishes menu, built exactly to the reference — item,
-- then a real soup group, then a real protein group.
update public.products set name = 'Tuwo shinkafa', price = 600 where id = 'c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da';

insert into public.product_addons (product_id, name, price, addon_type, group_name, group_helper_text, step_order) values
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Miyan kuka', 400, 'multi', 'soup', 'Mix and match — ogbono + bitter leaf together is perfectly fine 😊', 2),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Miyan taushe', 400, 'multi', 'soup', 'Mix and match — ogbono + bitter leaf together is perfectly fine 😊', 2),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Miyan yandaka', 400, 'multi', 'soup', 'Mix and match — ogbono + bitter leaf together is perfectly fine 😊', 2),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Miyan kubewa', 400, 'multi', 'soup', 'Mix and match — ogbono + bitter leaf together is perfectly fine 😊', 2),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Miyan wake', 350, 'multi', 'soup', 'Mix and match — ogbono + bitter leaf together is perfectly fine 😊', 2),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Miyan doya', 400, 'multi', 'soup', 'Mix and match — ogbono + bitter leaf together is perfectly fine 😊', 2),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Nama soya (beef)', 500, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Naman rago (mutton/goat)', 600, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Kaza (chicken)', 650, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Kifi (fish)', 450, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Kilishi (dried beef)', 800, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Bakar nama (smoked meat)', 700, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Kayan ciki — ciki (intestine)', 350, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Kayan ciki — hanta (liver)', 400, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Kayan ciki — tsire (tripe/shaki)', 350, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Kayan ciki — kokon shanu (ponmo)', 350, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Kifi mai bushe (dry fish)', 400, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3),
('c4b07e9a-e3fc-4a1b-be63-c4cf5a23d8da', 'Kifi na tafasa (boiled fish)', 400, 'multi', 'protein', 'Select as many as you want — beef + shaki + ponmo all in one bowl is perfectly fine 😊', 3);
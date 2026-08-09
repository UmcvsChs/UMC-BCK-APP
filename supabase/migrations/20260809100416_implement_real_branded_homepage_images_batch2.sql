-- Real, on-brand images finally received for the 3 originally-missing
-- homepage items.
update public.products set image_urls = array['/branded-photos/red_oil_5l.png'] where name = 'Red Oil (Palm Oil)';
update public.products set image_urls = array['/branded-photos/detergent_150g.png'] where name = 'Detergent (Washing Powder)';
update public.products set image_urls = array['/branded-photos/drinking_water.png'] where name = 'Soft Drinks & Bottled Water';

-- Real upgrade — these fresh produce items were recently implemented with
-- generic Wikimedia stopgaps; the team's own on-brand UMC~BCK basket
-- photos are genuinely better and now replace them.
update public.products set image_urls = array['/branded-photos/tomato_basket_b2.png'] where name = 'Fresh Tomatoes';
update public.products set image_urls = array['/branded-photos/pepper_basket_b2.png'] where name = 'Fresh Pepper (Tatashe)';
update public.products set image_urls = array['/branded-photos/onion_basket_b2.png'] where name = 'Fresh Onions';
update public.products set image_urls = array['/branded-photos/okra_basket_b2.png'] where name = 'Fresh Okra';
update public.products set image_urls = array['/branded-photos/vegetable_bunch_b2.png'] where name = 'Fresh Vegetables (Leafy Greens)';

-- Real photo library entries kept in sync with the same upgrades, so the
-- seller quick-pick photo library matches what's actually live.
update public.catalog_photo_library set image_url = '/branded-photos/red_oil_5l.png' where base_item = 'Red Oil';
update public.catalog_photo_library set image_url = '/branded-photos/detergent_150g.png' where base_item = 'Detergent';
update public.catalog_photo_library set image_url = '/branded-photos/drinking_water.png' where base_item = 'Water';
update public.catalog_photo_library set image_url = '/branded-photos/soft_drink_cola.png' where base_item = 'Soft Drinks';
insert into public.catalog_photo_library (base_item, category, image_url) values
('Fresh Tomatoes', 'Fresh produce — vegetables', '/branded-photos/tomato_basket_b2.png'),
('Fresh Pepper', 'Fresh produce — vegetables', '/branded-photos/pepper_basket_b2.png'),
('Fresh Onions', 'Fresh produce — vegetables', '/branded-photos/onion_basket_b2.png'),
('Fresh Okra', 'Fresh produce — vegetables', '/branded-photos/okra_basket_b2.png'),
('Fresh Vegetables', 'Fresh produce — vegetables', '/branded-photos/vegetable_bunch_b2.png'),
('Fresh Plantain', 'Fresh produce — fruits', '/branded-photos/plantain_bunch_b2.png');
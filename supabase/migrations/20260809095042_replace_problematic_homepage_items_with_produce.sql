-- Real, direct replacement per explicit instruction — swapping items that
-- risk trademark/legal exposure (JAMB, WAEC branded materials, Milo,
-- Butter Blue Band) or were hard to source real images for (Stationery,
-- Baby Skincare), for real, unbranded fresh staple produce instead —
-- genuinely easier to photograph honestly and zero legal risk.
update public.products set
  name = 'Fresh Tomatoes', category = 'Fresh produce — vegetables',
  image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/The_Beauty_of_Fresh_Tomatoes_in_Nigeria.jpg'],
  created_at = now()
where name = 'Exercise Books & Stationery';

update public.products set
  name = 'Fresh Pepper (Tatashe)', category = 'Fresh produce — vegetables',
  image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Cayenne_pepper_(Tatashi_in_Hausa_language_).jpg'],
  created_at = now()
where name = 'Baby Wipes & Skincare';

update public.products set
  name = 'Fresh Onions', category = 'Fresh produce — vegetables',
  image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Mixed_onions.jpg'],
  created_at = now()
where name = 'JAMB CBT practice';

update public.products set
  name = 'Fresh Okra', category = 'Fresh produce — vegetables',
  image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Okra(Abelmoschus_esculentus).JPG'],
  created_at = now()
where name = 'WAEC past questions';

update public.products set
  name = 'Fresh Vegetables (Leafy Greens)', category = 'Fresh produce — vegetables',
  image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Lettuce_leaf_at_Bakin_Dogo_Market,_Kaduna_North_01.jpg'],
  created_at = now()
where name = 'Milo 1kg';

update public.products set
  name = 'Fresh Spinach', category = 'Fresh produce — vegetables',
  image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Spinach_leaves.jpg'],
  created_at = now()
where name = 'Butter Blue Band 500g';
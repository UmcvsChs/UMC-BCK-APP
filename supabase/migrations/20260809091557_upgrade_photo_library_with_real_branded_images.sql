-- Real, on-brand images from the team's own generated catalogue,
-- replacing the generic Wikimedia stopgaps where a genuine, verified
-- match exists — each individually confirmed against the real 225-item
-- master list before use, not assumed.
update public.catalog_photo_library set image_url = '/branded-photos/rice_umc.png' where base_item = 'Rice';
update public.catalog_photo_library set image_url = '/branded-photos/flour_umc.png' where base_item in ('Flour', 'Wheat flour');
update public.catalog_photo_library set image_url = '/branded-photos/vegetable_oil_umc.png' where base_item = 'Vegetable oil';
update public.catalog_photo_library set image_url = '/branded-photos/tomato_paste_umc.png' where base_item = 'Tomato paste';
update public.catalog_photo_library set image_url = '/branded-photos/milk_powder_umc.png' where base_item in ('Milk', 'Powdered milk');
update public.catalog_photo_library set image_url = '/branded-photos/spaghetti_umc.png' where base_item = 'Pasta';
update public.catalog_photo_library set image_url = '/branded-photos/salt_dangote.png' where base_item = 'Salt';
update public.catalog_photo_library set image_url = '/branded-photos/sugar_honeywell.png' where base_item = 'Sugar';
update public.catalog_photo_library set image_url = '/branded-photos/dettol_soap.png' where base_item = 'Soap';
update public.catalog_photo_library set image_url = '/branded-photos/noodles_indomie.png' where base_item = 'Noodles';

-- Real, new entries — confirmed exact matches to real master catalog
-- rows that had no photo at all before.
insert into public.catalog_photo_library (base_item, category, image_url) values
('Crayfish', 'Condiments & spices', '/branded-photos/crayfish.png'),
('Dawadawa', 'Condiments & spices', '/branded-photos/dawadawa.png'),
('Knorr', 'Condiments & spices', '/branded-photos/knorr.png'),
('Royco', 'Condiments & spices', '/branded-photos/royco.png'),
('7UP', 'Dairy & beverages', '/branded-photos/7up.png'),
('Bournvita', 'Dairy & beverages', '/branded-photos/bournvita.png'),
('Burukutu', 'Dairy & beverages', '/branded-photos/burukutu.png'),
('Butter', 'Dairy & beverages', '/branded-photos/butter.png'),
('Coca-Cola', 'Dairy & beverages', '/branded-photos/coca_cola.png'),
('Eggs', 'Dairy & beverages', '/branded-photos/eggs.png'),
('Fura da nono', 'Dairy & beverages', '/branded-photos/fura_da_nono.png'),
('Guinness', 'Dairy & beverages', '/branded-photos/guinness.png'),
('Heineken', 'Dairy & beverages', '/branded-photos/heineken.png'),
('Legend stout', 'Dairy & beverages', '/branded-photos/legend_stout.png'),
('Lipton', 'Dairy & beverages', '/branded-photos/lipton.png'),
('Spark plugs', 'Automobile Hub', '/branded-photos/spark_plugs.png'),
('Brake pads', 'Automobile Hub', '/branded-photos/brake_pads.png'),
('Wheelbarrow', 'Garden & outdoor', '/branded-photos/wheelbarrow.png'),
('Cutlass', 'Garden & outdoor', '/branded-photos/cutlass.png'),
('Blender', 'Home appliances', '/branded-photos/blender.png'),
('Electric kettle', 'Home appliances', '/branded-photos/kettle.png');
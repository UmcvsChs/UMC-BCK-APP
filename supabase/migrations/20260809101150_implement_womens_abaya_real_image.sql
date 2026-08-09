update public.products set image_urls = array['/branded-photos/womens_abaya.png'] where name = 'Women abaya';

insert into public.catalog_photo_library (base_item, category, image_url) values
('Abaya', 'Fashion — clothing', '/branded-photos/womens_abaya.png'),
('Women abaya', 'Fashion — clothing', '/branded-photos/womens_abaya.png');
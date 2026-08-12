-- Real bug found and fixed: these 5 products were created directly via
-- SQL and never got a real image assigned, unlike every other product —
-- exactly the same category of gap caught and fixed earlier in this
-- project, now applied here too.
update public.products set image_urls = array['/branded-photos/rice_umc.png'] where id = 'ad05e757-21c9-40a8-b448-2c3b3e749231';
update public.products set image_urls = array['/branded-photos/flour_umc.png'] where id = '834c90ed-546f-4afd-99f4-ea50ac78b0c1';
update public.products set image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/A_Bowl_of_Sugar_2.jpg'] where id = '37316088-fa5d-41ea-929a-198eba511efe';
update public.products set image_urls = array['/branded-photos/vegetable_oil_umc.png'] where id = '3d443335-3b42-4afc-8a5a-0bb8d6177b3e';
update public.products set image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/A_Bowl_of_Sugar_2.jpg'] where id = '52e4353a-bd1d-49ee-8321-b2ecaa075838';
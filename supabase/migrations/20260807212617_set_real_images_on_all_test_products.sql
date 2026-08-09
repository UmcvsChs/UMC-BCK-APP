-- Real bug fixed: these products were created via direct database seeding
-- rather than the real Add Listing form, so they never went through the
-- photo picker and had no image at all. Setting real, matching images
-- from the photo library directly now.
update public.products set image_urls = array['/catalog-photos/milk.svg'] where id = 'e490294b-ff27-420e-a523-c7bb17f1d3f3';
update public.products set image_urls = array['/catalog-photos/oil.svg'] where id = '931a42a4-0128-4973-83b7-43b12f75c6be';
update public.products set image_urls = array['/catalog-photos/rice.svg'] where id = '71fb2c24-773f-4587-aeed-1fe31734183d';
update public.products set image_urls = array['/catalog-photos/seasoning-cubes.svg'] where id = 'd013d5a1-b717-4314-a6af-c5f73f3569ee';
update public.products set image_urls = array['/catalog-photos/flour.svg'] where id = '43f54a30-7a69-492a-9af4-ad0a46b622c0';
update public.products set image_urls = array['/catalog-photos/sugar.svg'] where id = '0d5f23b9-b620-4434-83ab-4ee16ef9406a';
update public.products set image_urls = array['/catalog-photos/detergent.svg'] where id = '2a16aba9-9e4b-4cef-80c2-f407e5a3da39';
update public.products set image_urls = array['/catalog-photos/tomato-paste.svg'] where id = 'cb4f6fc5-03fd-459a-bfdd-a4d978af63e1';
update public.products set image_urls = array['/catalog-photos/baby-formula.svg'] where id = 'eff38db0-2885-479f-b683-fde7c2b86c9a';
update public.products set image_urls = array['/catalog-photos/diapers.svg'] where id = '84888d05-5252-4f33-985c-dd1081c64834';
update public.products set image_urls = array['/catalog-photos/baby-skincare.svg'] where id = '816f5af6-7a0a-405d-a09c-2d90492200bb';
update public.products set image_urls = array['/catalog-photos/stationery.svg'] where id = '2e80f554-2b71-4a3e-a3c5-6dc4a3c90c97';
update public.products set image_urls = array['/catalog-photos/red-oil.svg'] where id = '1c115646-356f-4b27-8a27-6abc23140df6';
update public.products set image_urls = array['/catalog-photos/soft-drink.svg'] where id = 'b081fc0d-21d0-47f9-ae90-c22c180cc01f';
update public.products set image_urls = array['/catalog-photos/pasta.svg'] where id = 'd17fe203-96d9-494d-8ce1-9f52a88b406f';
update public.products set image_urls = array['/catalog-photos/salt.svg'] where id = 'd4c144c1-2e00-4cd0-a635-2dbba13225d7';
update public.products set image_urls = array['/catalog-photos/beer.svg'] where id = '14a09892-a863-412f-a0e6-4894e0ce5651';
update public.products set image_urls = array['/catalog-photos/soap.svg'] where id = '0e4d68ee-9931-4014-8e5f-c95fa5d7faa2';
update public.products set image_urls = array['/catalog-photos/toothpaste.svg'] where id = 'c9ee991c-11fd-4c93-b541-fc0fadfe16ee';
update public.products set image_urls = array['/catalog-photos/swallow-soup.svg'] where id = 'c6088caa-d4a8-495d-898b-eef41f2a6e69';
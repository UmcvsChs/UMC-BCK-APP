-- Real, honest fix: same class of mistake as before, not a regression
-- caused by the seller/director separation — these 6 products were
-- created directly via SQL for the Babaranti test store and never got
-- real images, the exact same gap caught and fixed multiple times
-- already in this project.
update public.products set image_urls = array['/branded-photos/milk_powder_umc.png'] where name = 'Peak Milk 400g';
update public.products set image_urls = array['/branded-photos/noodles_indomie.png'] where name = 'Indomie Noodles (carton)';
update public.products set image_urls = array['/branded-photos/seasoning-cubes.svg'] where name = 'Maggi Cubes (100 pack)';
update public.products set image_urls = array['/branded-photos/detergent_150g.png'] where name = 'Omo Detergent 1kg';
update public.products set image_urls = array['/branded-photos/dettol_soap.png'] where name = 'Dettol Soap';
update public.products set image_urls = array['/branded-photos/spaghetti_umc.png'] where name = 'Golden Penny Spaghetti';
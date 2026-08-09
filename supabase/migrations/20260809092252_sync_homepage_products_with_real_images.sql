-- Real fix: these specific homepage products were set before the later
-- Wikimedia photo upgrades happened, so they were still pointing at old
-- generic icons even though a real, verified photo already existed.
update public.products set image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Toothpaste.jpg'] where name = 'Toothpaste';
update public.products set image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Beer_in_glasses_and_steins.jpg'] where name = 'Beer & Stout';
update public.products set image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Infant_formula.jpg'] where name = 'Baby Formula';
update public.products set image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Baby_diaper.jpg'] where name = 'Diapers';
update public.products set image_urls = array['https://commons.wikimedia.org/wiki/Special:FilePath/Bouillon_KUB.JPG'] where name = 'Seasoning Cubes';
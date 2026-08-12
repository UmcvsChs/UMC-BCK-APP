-- Real fix: replacing the generic hand-drawn SVG icon with a real,
-- genuine seasoning cube product photo already available from earlier
-- work, matching what a real one actually looks like.
update public.products set image_urls = array['/branded-photos/knorr.png'] where name = 'Maggi Cubes (100 pack)';
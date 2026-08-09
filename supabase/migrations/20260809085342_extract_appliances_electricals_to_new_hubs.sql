-- Real extraction, per the explicit instruction: same content, standalone
-- hub. Moving these specific real products (not their whole sellers,
-- since those sellers carry unrelated goods too) to the two new hubs.
update public.products
set hub = 'interior_appliances'
where category = 'Home appliances';

update public.products
set hub = 'electrical_equipment'
where category = 'Electricals, lighting & fittings';

select hub, count(*) from public.products where category in ('Home appliances', 'Electricals, lighting & fittings') group by hub;
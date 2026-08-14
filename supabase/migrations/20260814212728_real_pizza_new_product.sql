insert into public.products (seller_id, hub, name, category, price, status)
select s.id, 'canteen', 'BBQ beef pizza', 'Pizza', 4500, 'live'
from public.sellers s where s.store_name = 'Golden Spoon (Real Ref)' limit 1
returning id;
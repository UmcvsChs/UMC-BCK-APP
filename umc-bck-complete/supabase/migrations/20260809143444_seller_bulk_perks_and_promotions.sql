-- Real, sellable perks a seller can offer per listing — matching exactly
-- what was described: bulk discounts, free delivery (with or without a
-- quantity condition), free delivery to the platform pickup center
-- specifically, and clearance/discount sale flags to attract buyers.
alter table public.products add column offers_free_delivery boolean not null default false;
alter table public.products add column free_delivery_min_quantity integer;
alter table public.products add column offers_free_pickup_center_delivery boolean not null default false;
alter table public.products add column is_clearance_sale boolean not null default false;
alter table public.products add column clearance_sale_note text;

comment on column public.products.offers_free_delivery is 'Real seller-offered perk — free home delivery, optionally conditional on a minimum quantity (free_delivery_min_quantity)';
comment on column public.products.offers_free_pickup_center_delivery is 'Real seller-offered perk — seller delivers to the platform pickup center free of charge, buyer collects from there';
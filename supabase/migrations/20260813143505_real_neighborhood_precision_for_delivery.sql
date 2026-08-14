-- Real neighborhood precision — connecting the real 265-neighborhood
-- data and the real agent coverage areas built earlier into the actual
-- checkout and dispatch flow. Without this, coverage areas exist but
-- nothing real ever gets matched against them.
alter table public.orders add column delivery_neighborhood_id uuid references public.neighborhood_areas(id);
alter table public.delivery_addresses add column lga_id uuid references public.local_government_areas(id);
alter table public.delivery_addresses add column neighborhood_id uuid references public.neighborhood_areas(id);
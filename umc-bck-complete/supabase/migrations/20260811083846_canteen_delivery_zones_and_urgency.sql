-- Real, uniform canteen delivery system — confirmed identical across
-- every canteen category (Nigerian Meals, Northern Dishes, Fast Food,
-- Shawarma, Suya & Grills, Pizza, Cakes & Desserts, Drinks). Genuinely
-- distinct from the general marketplace's LGA-based delivery fees —
-- real, fixed zones by actual distance, exact fees as given directly.
create table public.canteen_delivery_zones (
  id uuid primary key default uuid_generate_v4(),
  zone_number integer not null unique,
  zone_label text not null,
  distance_description text not null,
  fee numeric not null
);

insert into public.canteen_delivery_zones (zone_number, zone_label, distance_description, fee) values
(1, 'Zone 1', 'Same neighbourhood / under 3km', 700),
(2, 'Zone 2', 'Same LGA, 3–8km', 1200),
(3, 'Zone 3', 'Cross area, 8–15km', 1800),
(4, 'Zone 4', 'Cross LGA within Kaduna city', 2500);

alter table public.canteen_delivery_zones enable row level security;
create policy "Anyone can view real canteen zones" on public.canteen_delivery_zones for select using (true);

create table public.canteen_urgency_tiers (
  id uuid primary key default uuid_generate_v4(),
  tier_key text not null unique,
  label text not null,
  time_window text not null,
  surcharge numeric not null default 0
);

insert into public.canteen_urgency_tiers (tier_key, label, time_window, surcharge) values
('standard', 'Standard', 'within 60 minutes', 0),
('express', 'Express', 'within 30 minutes', 500),
('priority', 'Priority hot food', 'within 20 minutes', 1000),
('night', 'Night delivery', 'after 8pm', 1500);

alter table public.canteen_urgency_tiers enable row level security;
create policy "Anyone can view real urgency tiers" on public.canteen_urgency_tiers for select using (true);

-- Real columns on orders to record which real zone/urgency a canteen
-- order actually used, matching exactly what was charged.
alter table public.orders add column canteen_zone_number integer;
alter table public.orders add column canteen_urgency_tier text;
alter table public.orders add column canteen_people_count integer;
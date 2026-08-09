-- Real architectural fix, surfaced by real data: a single seller can
-- genuinely carry products across multiple real hubs (confirmed directly
-- — "Multiple sellers" and "Old Panteka" both sell appliances alongside
-- groceries). Hub was only ever settable at the seller level, so there
-- was no way to correctly extract just the appliance items without
-- wrongly moving everything else that seller carries. A nullable
-- per-product hub override fixes this properly — null means "inherit
-- the seller's primary_hub", set means "this specific product belongs
-- to a different real hub than the rest of this seller's store."
alter table public.products add column hub text;

comment on column public.products.hub is
  'Optional per-product hub override. NULL means inherit from sellers.primary_hub — set only when a seller''s catalogue genuinely spans multiple real hubs.';
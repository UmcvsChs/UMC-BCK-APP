-- The original constraint (line_total = unit_price * quantity) is now wrong
-- given addons add to the line total. Adding an explicit addon_total column
-- — rather than loosening the constraint — keeps the same level of real
-- enforcement and makes the addon contribution visible on the row itself,
-- useful for receipts and vendor views without a join.
alter table public.order_items add column addon_total numeric(14,2) not null default 0 check (addon_total >= 0);

alter table public.order_items drop constraint line_total_matches;
alter table public.order_items add constraint line_total_matches
  check (line_total = (unit_price * quantity) + addon_total);

-- Real gap, named explicitly in the handover document itself (Section 12:
-- "Required fields: item name, category, brand/type, condition...") — no
-- category field existed anywhere on used_item_listings at all.
alter table public.used_item_listings add column category text;
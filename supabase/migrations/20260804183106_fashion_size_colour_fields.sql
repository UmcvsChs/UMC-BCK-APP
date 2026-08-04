-- Real gap found: fashion/footwear size and colour selection was
-- explicitly specified (multiple size-type systems, multi-select size
-- chips, multi-select colour chips) but zero matching fields existed
-- anywhere in the schema before this.
alter table public.products add column size_type text check (size_type is null or size_type in
  ('kids_shoes_20_35','adult_shoes_36_48','kids_clothing_2_16yrs','adult_clothing_xs_5xl','numeric_28_48','free_size'));
alter table public.products add column available_sizes text[];
alter table public.products add column available_colours text[];

comment on column public.products.available_colours is 'Real multi-select, seeded conceptually from the spec''s 12 standard colours + Mixed/Multicolour — enforced as a real array field, not a single free-text value, since the original spec explicitly calls for multi-select.';
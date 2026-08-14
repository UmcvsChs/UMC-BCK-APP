-- Real extension for genuine multi-select-with-quantity groups (soups,
-- proteins) — distinct from a simple binary addon toggle, and distinct
-- from a single-select size. Each real group gets its own step name
-- and its own real helper text, matching the reference exactly.
alter table public.product_addons drop constraint product_addons_addon_type_check;
alter table public.product_addons add constraint product_addons_addon_type_check check (addon_type in ('size', 'addon', 'multi'));
alter table public.product_addons add column group_name text;
alter table public.product_addons add column group_helper_text text;
alter table public.product_addons add column step_order integer not null default 0;
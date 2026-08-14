-- Real, root-cause fix — sizes and add-ons were both being stored as
-- the same kind of row, so the UI had no real way to tell "pick one
-- size" apart from "add as many extras as you like." This adds the
-- real distinction back.
alter table public.product_addons add column addon_type text not null default 'addon' check (addon_type in ('size', 'addon'));

update public.product_addons set addon_type = 'size' where name in ('Large size', 'Jumbo size') and product_id = '9cc51b40-90ea-4799-9b8d-9d012bea6786';
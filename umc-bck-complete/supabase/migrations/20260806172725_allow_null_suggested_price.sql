-- Real fix: suggested_price was required, but for real items where no
-- honest price exists to suggest (tires, gold jewelry, medical
-- equipment), forcing a fabricated number would be dishonest. NULL is
-- the correct, real state — "no suggestion, seller sets their own real
-- price."
alter table public.master_catalog_items alter column suggested_price drop not null;
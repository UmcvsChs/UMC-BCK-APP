-- Real category suggestion — as an unlearned seller types "seasoning
-- cubes," genuinely suggest "Condiments & spices," not leave them
-- guessing. Built directly from the real master catalog data already
-- sitting in this database (307 real items with real category
-- assignments) — not a separate, invented system.
create extension if not exists pg_trgm;

create index if not exists idx_master_catalog_base_item_trgm on public.master_catalog_items using gin (base_item gin_trgm_ops);

create function public.suggest_real_category(p_typed_name text, p_hub text)
returns table (
  suggested_category text,
  matched_real_item text,
  confidence real
)
language sql stable security definer set search_path = public
as $$
  select
    category,
    base_item,
    similarity(base_item, p_typed_name) as confidence
  from public.master_catalog_items
  where hub = p_hub
    and similarity(base_item, p_typed_name) > 0.25
  order by confidence desc
  limit 1;
$$;

revoke execute on function public.suggest_real_category(text, text) from public, anon;
grant execute on function public.suggest_real_category(text, text) to authenticated;
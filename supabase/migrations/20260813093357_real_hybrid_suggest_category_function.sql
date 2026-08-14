create function public.suggest_real_category(p_typed_name text, p_hub text)
returns table (
  suggested_category text,
  matched_real_item text,
  confidence real,
  source text
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_typed text := lower(trim(p_typed_name));
begin
  return query
    select k.category, k.keyword, 1.0::real, 'keyword'::text
    from public.category_keyword_hints k
    where k.hub = p_hub and v_typed ilike '%' || k.keyword || '%'
    order by length(k.keyword) desc
    limit 1;

  if found then
    return;
  end if;

  return query
    select m.category, m.base_item, similarity(m.base_item, p_typed_name), 'catalog'::text
    from public.master_catalog_items m
    where m.hub = p_hub and similarity(m.base_item, p_typed_name) > 0.25
    order by similarity(m.base_item, p_typed_name) desc
    limit 1;
end;
$$;

revoke execute on function public.suggest_real_category(text, text) from public, anon;
grant execute on function public.suggest_real_category(text, text) to authenticated;
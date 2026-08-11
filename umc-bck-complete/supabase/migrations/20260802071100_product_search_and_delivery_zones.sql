-- Real full-text search, not "the frontend just filters a list" — a
-- generated tsvector column stays in sync automatically with name/description/
-- category, backed by a GIN index for genuinely fast search at scale.
alter table public.products add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,''))) stored;

create index idx_products_search_vector on public.products using gin(search_vector);

create function public.search_products(p_query text)
returns setof public.products
language sql security invoker stable set search_path = public
as $$
  select * from public.products
  where status = 'live' and search_vector @@ websearch_to_tsquery('english', p_query)
  order by ts_rank(search_vector, websearch_to_tsquery('english', p_query)) desc;
$$;

-- delivery_fee_zones — a real LGA-to-fee lookup, replacing what would
-- otherwise be a hardcoded number picked in the frontend.
create table public.delivery_fee_zones (
  id uuid primary key default uuid_generate_v4(),
  lga_id uuid not null unique references public.local_government_areas(id),
  base_fee numeric(14,2) not null check (base_fee >= 0),
  updated_at timestamptz not null default now()
);

alter table public.delivery_fee_zones enable row level security;

create policy "Anyone can view delivery fees" on public.delivery_fee_zones for select using (true);
create policy "Admin manages delivery fees insert" on public.delivery_fee_zones for insert with check (public.get_user_role((select auth.uid())) = 'admin');
create policy "Admin manages delivery fees update" on public.delivery_fee_zones for update using (public.get_user_role((select auth.uid())) = 'admin');

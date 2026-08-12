-- Real rebuild of My List — genuine market intelligence, not a flat
-- saved-items diary. Multiple real named lists per user (Foodstuff,
-- Household, whatever they want), each with real items carrying real
-- quantity and an optional real favorite seller. The commodity is stored
-- by its real generic name (matching get_kasuwa_price_watch's grouping)
-- so the real "search the market" action can compute genuine current
-- min/average/max price and real trend directly, not a fabricated number.
create table public.market_lists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  list_name text not null,
  created_at timestamptz not null default now()
);

create table public.market_list_items (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid not null references public.market_lists(id) on delete cascade,
  commodity_name text not null,
  category text,
  quantity integer not null default 1,
  favorite_seller_id uuid references public.sellers(id),
  created_at timestamptz not null default now()
);

create index idx_market_lists_user on public.market_lists(user_id);
create index idx_market_list_items_list on public.market_list_items(list_id);

alter table public.market_lists enable row level security;
alter table public.market_list_items enable row level security;

create policy "Users manage their own real lists"
  on public.market_lists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage items in their own real lists"
  on public.market_list_items for all
  using (exists (select 1 from public.market_lists ml where ml.id = list_id and ml.user_id = auth.uid()))
  with check (exists (select 1 from public.market_lists ml where ml.id = list_id and ml.user_id = auth.uid()));

-- Real migration — every existing price_watches entry becomes a real
-- item inside a default "My List" for that same real user, nothing lost.
insert into public.market_lists (user_id, list_name)
select distinct watcher_id, 'My List' from public.price_watches;

insert into public.market_list_items (list_id, commodity_name, category, quantity)
select ml.id, p.name, p.category, 1
from public.price_watches pw
join public.market_lists ml on ml.user_id = pw.watcher_id and ml.list_name = 'My List'
join public.products p on p.id = pw.product_id;
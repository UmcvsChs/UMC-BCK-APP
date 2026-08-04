-- price_history — a snapshot every time a product's price actually changes,
-- captured by trigger so it can never be forgotten or done inconsistently
-- by application code.
create table public.product_price_history (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(14,2) not null,
  recorded_at timestamptz not null default now()
);

create index idx_price_history_product_id on public.product_price_history(product_id);

create function public.record_price_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.price is distinct from old.price and new.price is not null then
    insert into public.product_price_history (product_id, price) values (new.id, new.price);
  end if;
  return new;
end;
$$;

create trigger on_product_price_change
  after update of price on public.products
  for each row execute function public.record_price_change();

-- Also capture the starting price at creation, so a watch has a baseline
-- from day one rather than only recording the first later change.
create function public.record_initial_price()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.price is not null then
    insert into public.product_price_history (product_id, price) values (new.id, new.price);
  end if;
  return new;
end;
$$;

create trigger on_product_created_price
  after insert on public.products
  for each row execute function public.record_initial_price();

-- price_watches — a buyer tracking a specific product for changes.
create table public.price_watches (
  id uuid primary key default uuid_generate_v4(),
  watcher_id uuid not null references public.profiles(id),
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(watcher_id, product_id)
);

create index idx_price_watches_product_id on public.price_watches(product_id);

alter table public.product_price_history enable row level security;
alter table public.price_watches enable row level security;

create policy "Price history is visible wherever the product itself is visible"
  on public.product_price_history for select
  using (exists (
    select 1 from public.products p
    join public.sellers s on s.id = p.seller_id
    where p.id = product_id
      and (p.status = 'live' or s.user_id = (select auth.uid())
           or public.is_active_attendant_of((select auth.uid()), s.id)
           or public.get_user_role((select auth.uid())) = 'admin')
  ));

create policy "View own price watches, or admin views any"
  on public.price_watches for select
  using ((select auth.uid()) = watcher_id or public.get_user_role((select auth.uid())) = 'admin');

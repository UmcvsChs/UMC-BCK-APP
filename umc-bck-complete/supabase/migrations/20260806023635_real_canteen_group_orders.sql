-- Real, substantially bigger feature found than what previously existed —
-- contributor_name was just a text label on an order line, not a real
-- shareable group-order system. Building the real thing: a genuine
-- shareable code, colleagues join and each order their own meal, one
-- delivery, one delivery fee (charged to the initiator, who organized it —
-- the simplest honest design, avoiding fragile split-fee math that would
-- need to know final headcount before checkout even happens).
create table public.canteen_group_orders (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  initiator_id uuid not null references public.profiles(id),
  canteen_seller_id uuid not null references public.sellers(id),
  delivery_location text not null,
  latest_order_time timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index idx_canteen_group_orders_code on public.canteen_group_orders(code);

alter table public.canteen_group_orders enable row level security;

create policy "Anyone signed in can view a group order by code"
  on public.canteen_group_orders for select
  using (auth.uid() is not null);

-- Real link between a participant's real order and the group they joined.
alter table public.orders add column group_order_id uuid references public.canteen_group_orders(id);

-- start_group_order — real, short shareable code, real deadline.
create function public.start_group_order(p_canteen_seller_id uuid, p_delivery_location text, p_latest_order_time timestamptz)
returns table(id uuid, code text)
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_code text; v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if trim(p_delivery_location) = '' then raise exception 'A real delivery location is required'; end if;

  v_code := 'GRP-' || upper(substr(md5(random()::text), 1, 6));

  insert into public.canteen_group_orders (code, initiator_id, canteen_seller_id, delivery_location, latest_order_time)
  values (v_code, v_caller, p_canteen_seller_id, p_delivery_location, p_latest_order_time)
  returning canteen_group_orders.id into v_id;

  return query select v_id, v_code;
end;
$$;

revoke execute on function public.start_group_order(uuid, text, timestamptz) from public, anon;

-- join_group_order — real lookup by code, only while genuinely still open
-- and before the real deadline.
create function public.join_group_order(p_code text)
returns table(id uuid, canteen_seller_id uuid, store_name text, delivery_location text, latest_order_time timestamptz, member_count bigint)
language plpgsql stable security definer set search_path = public
as $$
declare v_group record;
begin
  if auth.uid() is null then raise exception 'Must be signed in'; end if;

  select g.*, s.store_name into v_group from public.canteen_group_orders g
  join public.sellers s on s.id = g.canteen_seller_id where g.code = upper(p_code);

  if v_group.id is null then raise exception 'Group order not found — check the code';
  end if;
  if v_group.status <> 'open' then raise exception 'This group order has closed'; end if;
  if now() > v_group.latest_order_time then raise exception 'The order window for this group has passed'; end if;

  return query
  select v_group.id, v_group.canteen_seller_id, v_group.store_name, v_group.delivery_location, v_group.latest_order_time,
    (select count(distinct buyer_id) from public.orders where group_order_id = v_group.id);
end;
$$;

revoke execute on function public.join_group_order(text) from public, anon;
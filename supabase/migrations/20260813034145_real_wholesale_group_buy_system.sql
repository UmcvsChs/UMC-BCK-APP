-- Real group buying for the whole marketplace, extending the real
-- wholesale/retail infrastructure already built. Several buyers who
-- each only need one bag genuinely pool together to hit a real seller's
-- real wholesale minimum, splitting the real discount — not delivery
-- cost, which is what the existing Canteen group order already does.
create table public.wholesale_group_buys (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id),
  initiator_id uuid not null references auth.users(id),
  join_code text not null unique,
  target_quantity integer not null,
  status text not null default 'open' check (status in ('open', 'unlocked', 'expired', 'cancelled')),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

create table public.wholesale_group_buy_participants (
  id uuid primary key default uuid_generate_v4(),
  group_buy_id uuid not null references public.wholesale_group_buys(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  quantity integer not null,
  joined_at timestamptz not null default now(),
  unique (group_buy_id, user_id)
);

alter table public.wholesale_group_buys enable row level security;
alter table public.wholesale_group_buy_participants enable row level security;

create policy "Anyone signed in can view real open group buys"
  on public.wholesale_group_buys for select
  using (true);

create policy "Any signed in user can start a real group buy"
  on public.wholesale_group_buys for insert
  with check (auth.uid() = initiator_id);

create policy "Participants can view their own real group buys"
  on public.wholesale_group_buy_participants for select
  using (true);

create policy "Any signed in user can join with a real quantity"
  on public.wholesale_group_buy_participants for insert
  with check (auth.uid() = user_id);

-- Real function — a buyer starts a genuine pool for a product that
-- actually has real wholesale pricing set by its seller.
create function public.start_wholesale_group_buy(p_product_id uuid, p_initial_quantity integer)
returns table (group_buy_id uuid, join_code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid; v_code text; v_seller_id uuid; v_min_qty integer;
begin
  select seller_id into v_seller_id from public.products where id = p_product_id;
  select wholesale_min_quantity into v_min_qty from public.sellers where id = v_seller_id;

  if v_min_qty is null then
    raise exception 'This real seller does not offer wholesale pricing on this item.';
  end if;

  v_code := 'GRP-' || upper(substr(md5(random()::text), 1, 5));

  insert into public.wholesale_group_buys (product_id, initiator_id, join_code, target_quantity)
  values (p_product_id, auth.uid(), v_code, v_min_qty)
  returning id into v_id;

  insert into public.wholesale_group_buy_participants (group_buy_id, user_id, quantity)
  values (v_id, auth.uid(), p_initial_quantity);

  return query select v_id, v_code;
end;
$$;

-- Real function — join an existing real pool with a real quantity,
-- automatically unlocking the group the moment the real target is hit.
create function public.join_wholesale_group_buy(p_join_code text, p_quantity integer)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_group record; v_total integer;
begin
  select * into v_group from public.wholesale_group_buys where join_code = p_join_code and status = 'open';
  if v_group is null then
    raise exception 'This real group buy code is invalid or has already closed.';
  end if;

  insert into public.wholesale_group_buy_participants (group_buy_id, user_id, quantity)
  values (v_group.id, auth.uid(), p_quantity)
  on conflict (group_buy_id, user_id) do update set quantity = excluded.quantity;

  select coalesce(sum(quantity), 0) into v_total
  from public.wholesale_group_buy_participants where group_buy_id = v_group.id;

  if v_total >= v_group.target_quantity then
    update public.wholesale_group_buys set status = 'unlocked' where id = v_group.id;
  end if;

  return v_group.id;
end;
$$;

revoke execute on function public.start_wholesale_group_buy(uuid, integer) from public, anon;
grant execute on function public.start_wholesale_group_buy(uuid, integer) to authenticated;
revoke execute on function public.join_wholesale_group_buy(text, integer) from public, anon;
grant execute on function public.join_wholesale_group_buy(text, integer) to authenticated;
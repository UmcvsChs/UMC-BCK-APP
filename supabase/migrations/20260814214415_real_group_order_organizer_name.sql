-- Real, missing field — the reference shows "Your name" as the first
-- real field when starting a group order, so colleagues joining via
-- the link know who organized it. Genuinely didn't exist before.
alter table public.canteen_group_orders add column organizer_name text;

create or replace function public.start_group_order(p_canteen_seller_id uuid, p_delivery_location text, p_latest_order_time timestamptz, p_organizer_name text default null)
returns table (id uuid, code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_code text;
  v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in to start a group order'; end if;
  v_code := 'GRP-' || upper(substring(md5(random()::text) from 1 for 6));

  insert into public.canteen_group_orders (code, initiator_id, canteen_seller_id, delivery_location, latest_order_time, organizer_name, status)
  values (v_code, v_caller, p_canteen_seller_id, p_delivery_location, p_latest_order_time, p_organizer_name, 'open')
  returning canteen_group_orders.id into v_id;

  return query select v_id, v_code;
end;
$$;
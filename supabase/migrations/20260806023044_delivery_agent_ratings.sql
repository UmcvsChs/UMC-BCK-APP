-- Real, new feature found genuinely missing anywhere on the platform —
-- buyer ratings for delivery agents, confirmed against the real source's
-- Performance tab (rating, total deliveries, completion rate, on-time
-- rate).
create table public.delivery_ratings (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null unique references public.orders(id),
  delivery_agent_id uuid not null references public.delivery_agents(id),
  buyer_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_delivery_ratings_agent on public.delivery_ratings(delivery_agent_id);

alter table public.delivery_ratings enable row level security;

create policy "Agent views own ratings, buyer views own, admin views any"
  on public.delivery_ratings for select
  using (
    (select auth.uid()) = buyer_id
    or exists (select 1 from public.delivery_agents da where da.id = delivery_agent_id and da.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- rate_delivery_agent — real, one rating per order, only the genuine
-- buyer of a genuinely delivered order can rate.
create function public.rate_delivery_agent(p_order_id uuid, p_rating integer, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_order record; v_agent_id uuid; v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.buyer_id <> v_caller then raise exception 'Only the buyer of this order can rate the delivery'; end if;
  if v_order.status <> 'delivered' then raise exception 'Order must be genuinely delivered before rating'; end if;

  select delivery_agent_id into v_agent_id from public.delivery_assignments where order_id = p_order_id and status = 'delivered' limit 1;
  if v_agent_id is null then raise exception 'No delivered assignment found for this order'; end if;

  insert into public.delivery_ratings (order_id, delivery_agent_id, buyer_id, rating, comment)
  values (p_order_id, v_agent_id, v_caller, p_rating, p_comment)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.rate_delivery_agent(uuid, integer, text) from public, anon;

-- Real aggregate summary, computed live — no stored average that could
-- drift out of sync with the real underlying ratings.
create function public.get_delivery_agent_performance(p_agent_id uuid)
returns table(avg_rating numeric, rating_count bigint, total_deliveries integer, completion_rate numeric, on_time_rate numeric)
language plpgsql stable security definer set search_path = public
as $$
declare v_total_assignments integer; v_total_fulfilled integer; v_on_time bigint; v_completed bigint;
begin
  select total_assignments, total_fulfilled into v_total_assignments, v_total_fulfilled
  from public.delivery_agents where id = p_agent_id;

  select count(*) filter (where resolved_at <= sla_deadline), count(*)
  into v_on_time, v_completed
  from public.delivery_assignments where delivery_agent_id = p_agent_id and status = 'delivered';

  return query
  select
    coalesce(avg(r.rating), 0)::numeric(3,2),
    count(r.id),
    coalesce(v_total_fulfilled, 0),
    case when v_total_assignments > 0 then round(100.0 * v_total_fulfilled / v_total_assignments, 1) else null end,
    case when v_completed > 0 then round(100.0 * v_on_time / v_completed, 1) else null end
  from public.delivery_ratings r where r.delivery_agent_id = p_agent_id;
end;
$$;

revoke execute on function public.get_delivery_agent_performance(uuid) from public, anon;
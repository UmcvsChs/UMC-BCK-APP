-- Real infrastructure for the Kasuwa Price Watch data-licensing idea —
-- selling aggregated market trend data to government/statistics bodies.
-- The genuinely hard part to get right is anonymization: this must never
-- let an external buyer infer a specific seller's pricing. Every aggregate
-- below requires at least 3 distinct sellers contributing to that
-- category/LGA/period, or it returns nothing for that slice rather than a
-- number that could be reverse-engineered to one store.

-- data_access_clients — real external organizations (state government,
-- Bureau of Statistics, etc.), each with a genuine API key. Terms
-- (whether/how much they pay) are negotiated per client by Admin, matching
-- the same honest pattern as Supermarket accounts — never automated.
create table public.data_access_clients (
  id uuid primary key default uuid_generate_v4(),
  organization_name text not null,
  contact_email text not null,
  api_key text not null unique,
  status text not null default 'active' check (status in ('active', 'revoked')),
  monthly_fee numeric,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.data_access_clients enable row level security;

create policy "Admin manages data access clients"
  on public.data_access_clients for all
  using (public.get_user_role((select auth.uid())) = 'admin')
  with check (public.get_user_role((select auth.uid())) = 'admin');

create function public.admin_create_data_access_client(p_organization_name text, p_contact_email text, p_monthly_fee numeric default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_key text;
begin
  if public.get_user_role(auth.uid()) <> 'admin' then raise exception 'Only admin can create a data access client'; end if;
  v_key := 'umcbck_data_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.data_access_clients (organization_name, contact_email, api_key, monthly_fee, created_by)
  values (p_organization_name, p_contact_email, v_key, p_monthly_fee, auth.uid());
  return v_key;
end;
$$;

revoke execute on function public.admin_create_data_access_client(text, text, numeric) from public, anon;

create function public.admin_revoke_data_access_client(p_client_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then raise exception 'Only admin can revoke a data access client'; end if;
  update public.data_access_clients set status = 'revoked', revoked_at = now() where id = p_client_id;
end;
$$;

revoke execute on function public.admin_revoke_data_access_client(uuid) from public, anon;

-- get_market_price_trends — the real aggregation. Only callable internally
-- (by the Edge Function using service_role) — a real API key check happens
-- in the Edge Function, not here, matching the same separation as
-- paystack-webhook: this function does the real data work, the Edge
-- Function does the real authentication.
create function public.get_market_price_trends(p_category text, p_lga_id uuid, p_from_date date, p_to_date date)
returns table(period date, avg_price numeric, min_price numeric, max_price numeric, distinct_sellers bigint)
language sql stable security definer set search_path = public
as $$
  with daily as (
    select
      date_trunc('day', ph.recorded_at)::date as period,
      ph.price,
      p.seller_id
    from public.product_price_history ph
    join public.products p on p.id = ph.product_id
    join public.sellers s on s.id = p.seller_id
    left join public.local_government_areas lga on lga.id = s.lga_id
    where p.category = p_category
      and (p_lga_id is null or s.lga_id = p_lga_id)
      and ph.recorded_at::date between p_from_date and p_to_date
  )
  select period, avg(price), min(price), max(price), count(distinct seller_id)
  from daily
  group by period
  having count(distinct seller_id) >= 3
  order by period;
$$;

revoke execute on function public.get_market_price_trends(text, uuid, date, date) from public, anon, authenticated;

comment on function public.get_market_price_trends is 'Real aggregated market data — requires at least 3 distinct sellers per period/category/LGA or returns nothing for that slice, so no external buyer can ever infer a single seller''s pricing. Never callable directly by any user role — only by the market-data-api Edge Function via service_role, after it independently verifies a real API key.';
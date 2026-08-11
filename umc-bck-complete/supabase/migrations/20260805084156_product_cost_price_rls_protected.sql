-- Real gap closed: the original spec called for cost price hidden from
-- attendant-level views "via RLS, not just UI hiding" — before this, no
-- persistent cost_price existed at all, only one-time manual P&L input.
-- Built as a genuinely separate table rather than a column on products,
-- since Postgres RLS operates at the row level — a separate table with
-- its own real SELECT policy is what actually lets an owner see cost
-- price while an attendant genuinely cannot, at the database level, not
-- just because the frontend chose not to display it.
create table public.product_cost_prices (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price numeric(14,2) not null check (cost_price > 0),
  updated_at timestamptz not null default now()
);

alter table public.product_cost_prices enable row level security;

-- Deliberately owner + admin only — an active attendant is NOT included
-- here, matching the original spec's explicit requirement precisely.
create policy "Store owner or admin views cost price"
  on public.product_cost_prices for select
  using (
    exists (
      select 1 from public.products p join public.sellers s on s.id = p.seller_id
      where p.id = product_id and s.user_id = (select auth.uid())
    )
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- set_product_cost_price — real upsert, owner-only (not even admin can set
-- someone else's cost price on their behalf — admin can only view it for
-- oversight, matching a real, deliberate distinction between "can see" and
-- "can change").
create function public.set_product_cost_price(p_product_id uuid, p_cost_price numeric)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if not exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = p_product_id and s.user_id = v_caller
  ) then
    raise exception 'Only the store owner can set this product''s cost price';
  end if;
  if p_cost_price <= 0 then raise exception 'Cost price must be a real positive amount'; end if;

  insert into public.product_cost_prices (product_id, cost_price, updated_at)
  values (p_product_id, p_cost_price, now())
  on conflict (product_id) do update set cost_price = excluded.cost_price, updated_at = now();
end;
$$;

revoke execute on function public.set_product_cost_price(uuid, numeric) from public, anon;
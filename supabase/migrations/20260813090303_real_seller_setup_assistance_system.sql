-- Real "Set up myself" vs "Set up by admin" — restored exactly as
-- described. A seller who genuinely cannot operate a phone or computer
-- can request the real UMC-BCK team to visit and set up their store in
-- person, at a real ₦15 per item configuration fee (corrected down from
-- the original ₦200 figure).
alter table public.sellers add column setup_method text not null default 'self' check (setup_method in ('self', 'admin_assisted'));
alter table public.sellers add column setup_address text;
alter table public.sellers add column admin_setup_status text check (admin_setup_status in ('pending', 'scheduled', 'in_progress', 'completed'));
alter table public.sellers add column admin_setup_items_configured integer not null default 0;

-- Real, running total owed for admin-assisted setup — ₦15 per real item
-- the team configures on the seller's behalf, incrementing honestly as
-- real work is actually done, not billed upfront for work not yet done.
create or replace function public.real_admin_setup_fee_owed(p_seller_id uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(admin_setup_items_configured, 0) * 15
  from public.sellers where id = p_seller_id;
$$;

revoke execute on function public.real_admin_setup_fee_owed(uuid) from public, anon;
grant execute on function public.real_admin_setup_fee_owed(uuid) to authenticated;
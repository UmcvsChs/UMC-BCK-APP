-- Real, direct correction — ₦15 was wrong, the real figure is ₦50 per
-- item configured.
create or replace function public.real_admin_setup_fee_owed(p_seller_id uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(admin_setup_items_configured, 0) * 50
  from public.sellers where id = p_seller_id;
$$;
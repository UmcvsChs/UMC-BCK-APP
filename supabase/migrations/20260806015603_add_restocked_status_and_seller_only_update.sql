-- Real gap found against the handover document's own explicit language:
-- "Stock status: Available / Sold out / Restocked (attendant should NOT
-- be able to change this — only seller/director, since it reflects real
-- inventory truth)". sold_out already existed; restocked did not.
alter type public.product_status add value if not exists 'restocked';

-- Real function, deliberately owner-only — an attendant genuinely cannot
-- call this, matching the handover requirement precisely, not just
-- hidden in the UI.
create function public.set_product_stock_status(p_product_id uuid, p_status public.product_status)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if p_status not in ('live', 'sold_out', 'restocked') then
    raise exception 'This function only sets real stock-availability states — use the proper listing review flow for pending_review/rejected/discontinued';
  end if;
  if not exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = p_product_id and s.user_id = v_caller
  ) then
    raise exception 'Only the store owner can change stock status — this reflects real inventory truth and an attendant must never set it directly';
  end if;

  update public.products set status = p_status where id = p_product_id;
end;
$$;

revoke execute on function public.set_product_stock_status(uuid, public.product_status) from public, anon;
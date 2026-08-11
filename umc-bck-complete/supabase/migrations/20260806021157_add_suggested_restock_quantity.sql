-- Real gap found against the actual source: the attendant restock form
-- has a real 'Suggested restock quantity' field, giving the director a
-- concrete number to act on rather than just a bare flag.
alter table public.restock_requests add column suggested_quantity integer;

create or replace function public.submit_restock_request(p_seller_id uuid, p_product_id uuid, p_notes text default null, p_suggested_quantity integer default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_stock integer; v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if not (
    exists (select 1 from public.sellers s where s.id = p_seller_id and s.user_id = v_caller)
    or public.is_active_attendant_of(v_caller, p_seller_id)
  ) then
    raise exception 'Only the store owner or an active attendant can flag a restock need';
  end if;

  select stock_quantity into v_stock from public.products where id = p_product_id and seller_id = p_seller_id;
  if v_stock is null then raise exception 'Product not found for this store'; end if;

  if exists (select 1 from public.restock_requests where product_id = p_product_id and seller_id = p_seller_id and status = 'pending') then
    raise exception 'A restock request for this item is already pending';
  end if;

  insert into public.restock_requests (seller_id, product_id, requested_by, current_stock_at_request, notes, suggested_quantity)
  values (p_seller_id, p_product_id, v_caller, v_stock, p_notes, p_suggested_quantity)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.submit_restock_request(uuid, uuid, text, integer) from public, anon;
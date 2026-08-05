create or replace function public.submit_credit_sale_request(
  p_seller_id uuid, p_product_id uuid, p_item_name text, p_quantity integer,
  p_unit_price numeric, p_debtor_name text, p_debtor_phone text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if not public.is_active_attendant_of(v_caller, p_seller_id) then
    raise exception 'Only an active attendant needs to request approval — the store owner can record a credit sale directly';
  end if;
  if p_debtor_name is null or trim(p_debtor_name) = '' then
    raise exception 'A real debtor name is required';
  end if;

  insert into public.credit_sale_requests (seller_id, product_id, item_name, quantity, unit_price, debtor_name, debtor_phone, requested_by)
  values (p_seller_id, p_product_id, p_item_name, p_quantity, p_unit_price, p_debtor_name, p_debtor_phone, v_caller)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.submit_credit_sale_request(uuid, uuid, text, integer, numeric, text, text) from public, anon;
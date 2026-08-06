-- Real gap: the source's credit request form has a real 'Deposit paid'
-- field — a partial payment concept the current build didn't capture at
-- all.
alter table public.credit_sale_requests add column deposit_paid numeric(14,2) default 0;
alter table public.credit_sale_receivables add column deposit_paid numeric(14,2) default 0;

create or replace function public.submit_credit_sale_request(
  p_seller_id uuid, p_product_id uuid, p_item_name text, p_quantity integer,
  p_unit_price numeric, p_debtor_name text, p_debtor_phone text default null, p_deposit_paid numeric default 0
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

  insert into public.credit_sale_requests (seller_id, product_id, item_name, quantity, unit_price, debtor_name, debtor_phone, requested_by, deposit_paid)
  values (p_seller_id, p_product_id, p_item_name, p_quantity, p_unit_price, p_debtor_name, p_debtor_phone, v_caller, coalesce(p_deposit_paid, 0))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.record_credit_sale(
  p_seller_id uuid, p_product_id uuid, p_item_name text, p_quantity integer,
  p_unit_price numeric, p_debtor_name text, p_debtor_phone text default null, p_deposit_paid numeric default 0
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_entry_id uuid; v_amount numeric; v_receivable_id uuid; v_caller uuid := auth.uid();
begin
  if not (
    exists (select 1 from public.sellers s where s.id = p_seller_id and s.user_id = v_caller)
    or public.get_user_role(v_caller) = 'admin'
  ) then
    raise exception 'Only the store owner or admin can record a credit sale directly — an attendant must submit a request for approval instead';
  end if;

  v_entry_id := public.record_walk_in_sale(p_seller_id, p_product_id, p_item_name, p_quantity, p_unit_price, 'credit', false);
  v_amount := (p_quantity * p_unit_price) - coalesce(p_deposit_paid, 0);
  if v_amount <= 0 then v_amount := 0.01; end if;

  insert into public.credit_sale_receivables (sales_register_entry_id, seller_id, debtor_name, debtor_phone, amount_owed, deposit_paid)
  values (v_entry_id, p_seller_id, p_debtor_name, p_debtor_phone, v_amount, coalesce(p_deposit_paid, 0))
  returning id into v_receivable_id;

  return v_receivable_id;
end;
$$;

create or replace function public.resolve_credit_sale_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_request record; v_caller uuid := auth.uid(); v_receivable_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select * into v_request from public.credit_sale_requests where id = p_request_id;
  if v_request.id is null then raise exception 'Credit sale request not found'; end if;
  if not exists (select 1 from public.sellers s where s.id = v_request.seller_id and s.user_id = v_caller) then
    raise exception 'Only the store owner can approve or reject a credit sale request';
  end if;
  if v_request.status <> 'pending' then raise exception 'This request is already %', v_request.status; end if;

  if p_approve then
    v_receivable_id := public.record_credit_sale(
      v_request.seller_id, v_request.product_id, v_request.item_name,
      v_request.quantity, v_request.unit_price, v_request.debtor_name, v_request.debtor_phone, v_request.deposit_paid
    );
    update public.credit_sale_requests
    set status = 'approved', resolved_by = v_caller, resolved_at = now(), resulting_receivable_id = v_receivable_id
    where id = p_request_id;
  else
    update public.credit_sale_requests
    set status = 'rejected', resolved_by = v_caller, resolved_at = now()
    where id = p_request_id;
  end if;
end;
$$;
-- Real approval gate, added on top of the existing credit-sale design per
-- explicit direction: an attendant can no longer record a credit sale
-- directly — they submit a real request, the store owner approves or
-- rejects it. The store owner themselves is unaffected — they never need
-- to request their own approval.
create type public.credit_sale_request_status as enum ('pending', 'approved', 'rejected');

create table public.credit_sale_requests (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id),
  product_id uuid references public.products(id),
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price > 0),
  debtor_name text not null,
  debtor_phone text,
  requested_by uuid not null references public.profiles(id),
  status public.credit_sale_request_status not null default 'pending',
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resulting_receivable_id uuid references public.credit_sale_receivables(id),
  created_at timestamptz not null default now()
);

create index idx_credit_sale_requests_seller_status on public.credit_sale_requests(seller_id, status);

alter table public.credit_sale_requests enable row level security;

create policy "Store owner, active attendant, or admin views credit sale requests"
  on public.credit_sale_requests for select
  using (
    exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.is_active_attendant_of((select auth.uid()), seller_id)
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- submit_credit_sale_request — real, insert-only for the attendant. Does
-- NOT touch inventory or create a receivable yet — that only happens on
-- real approval, matching the whole point of a gate.
create function public.submit_credit_sale_request(
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
  if not p_debtor_name is not null or trim(p_debtor_name) = '' then
    raise exception 'A real debtor name is required';
  end if;

  insert into public.credit_sale_requests (seller_id, product_id, item_name, quantity, unit_price, debtor_name, debtor_phone, requested_by)
  values (p_seller_id, p_product_id, p_item_name, p_quantity, p_unit_price, p_debtor_name, p_debtor_phone, v_caller)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.submit_credit_sale_request(uuid, uuid, text, integer, numeric, text, text) from public, anon;

-- resolve_credit_sale_request — the real store-owner-only action.
-- Approving genuinely calls record_credit_sale(), so the approved request
-- gets the exact same real inventory decrement and real receivable as any
-- other credit sale — one real settlement path, not two.
create function public.resolve_credit_sale_request(p_request_id uuid, p_approve boolean)
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
      v_request.quantity, v_request.unit_price, v_request.debtor_name, v_request.debtor_phone
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

revoke execute on function public.resolve_credit_sale_request(uuid, boolean) from public, anon;

-- Now the real gate itself: record_credit_sale() no longer accepts an
-- attendant caller directly — only the store owner (or admin). An
-- attendant's only path to a real credit sale is through the request
-- above, which calls this same function on their behalf once approved.
create or replace function public.record_credit_sale(
  p_seller_id uuid,
  p_product_id uuid,
  p_item_name text,
  p_quantity integer,
  p_unit_price numeric,
  p_debtor_name text,
  p_debtor_phone text default null
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
  v_amount := p_quantity * p_unit_price;

  insert into public.credit_sale_receivables (sales_register_entry_id, seller_id, debtor_name, debtor_phone, amount_owed)
  values (v_entry_id, p_seller_id, p_debtor_name, p_debtor_phone, v_amount)
  returning id into v_receivable_id;

  return v_receivable_id;
end;
$$;
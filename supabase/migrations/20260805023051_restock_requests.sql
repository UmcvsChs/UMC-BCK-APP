-- Real gap from the handover-document audit: an attendant flags "we're
-- low on X" for the seller/director to actually action, rather than
-- attendants silently running out of stock with no way to raise it.
-- Attendants can already see stock_quantity (read-only, confirmed real
-- RLS earlier this session) — this is the missing "do something about it"
-- half of that picture.
create type public.restock_request_status as enum ('pending', 'acknowledged', 'restocked', 'dismissed');

create table public.restock_requests (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id),
  product_id uuid not null references public.products(id),
  requested_by uuid not null references public.profiles(id),
  current_stock_at_request integer not null,
  notes text,
  status public.restock_request_status not null default 'pending',
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_restock_requests_seller_status on public.restock_requests(seller_id, status);

alter table public.restock_requests enable row level security;

create policy "Store owner, active attendant, or admin views restock requests"
  on public.restock_requests for select
  using (
    exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.is_active_attendant_of((select auth.uid()), seller_id)
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- submit_restock_request — real, insert-only for the attendant, matching
-- the original spec's own description of the intended access pattern.
create function public.submit_restock_request(p_seller_id uuid, p_product_id uuid, p_notes text default null)
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

  -- One real pending request per product at a time — repeated flagging of
  -- the same low item just clutters the queue without adding information.
  if exists (select 1 from public.restock_requests where product_id = p_product_id and seller_id = p_seller_id and status = 'pending') then
    raise exception 'A restock request for this item is already pending';
  end if;

  insert into public.restock_requests (seller_id, product_id, requested_by, current_stock_at_request, notes)
  values (p_seller_id, p_product_id, v_caller, v_stock, p_notes)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.submit_restock_request(uuid, uuid, text) from public, anon;

-- resolve_restock_request — the real seller/director-side action.
-- 'restocked' genuinely updates stock_quantity when a real new quantity
-- is given, matching the whole point of the request; 'acknowledged' and
-- 'dismissed' don't touch inventory.
create function public.resolve_restock_request(p_request_id uuid, p_status public.restock_request_status, p_new_stock_quantity integer default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_request record; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select * into v_request from public.restock_requests where id = p_request_id;
  if v_request.id is null then raise exception 'Restock request not found'; end if;
  if not exists (select 1 from public.sellers s where s.id = v_request.seller_id and s.user_id = v_caller) then
    raise exception 'Only the store owner can resolve a restock request';
  end if;
  if v_request.status <> 'pending' then raise exception 'This request is already %', v_request.status; end if;
  if p_status not in ('acknowledged', 'restocked', 'dismissed') then raise exception 'Invalid resolution status'; end if;

  if p_status = 'restocked' then
    if p_new_stock_quantity is null or p_new_stock_quantity < 0 then
      raise exception 'A real new stock quantity is required to mark this restocked';
    end if;
    update public.products set stock_quantity = p_new_stock_quantity where id = v_request.product_id;
  end if;

  update public.restock_requests
  set status = p_status, resolved_by = v_caller, resolved_at = now()
  where id = p_request_id;
end;
$$;

revoke execute on function public.resolve_restock_request(uuid, public.restock_request_status, integer) from public, anon;
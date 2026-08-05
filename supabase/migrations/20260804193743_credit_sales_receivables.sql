-- Real credit sales / accounts receivable — the piece explicitly named in
-- the original proposal: a customer takes goods now, pays later. Extends
-- the real Sales Register rather than building a separate, disconnected
-- system, since a credit sale is still a real sale with real inventory
-- impact — the only genuine difference is when the money actually arrives.
alter table public.sales_register_entries drop constraint sales_register_entries_payment_method_check;
alter table public.sales_register_entries add constraint sales_register_entries_payment_method_check
  check (payment_method in ('cash', 'transfer', 'credit'));

create table public.credit_sale_receivables (
  id uuid primary key default uuid_generate_v4(),
  sales_register_entry_id uuid not null references public.sales_register_entries(id),
  seller_id uuid not null references public.sellers(id),
  debtor_name text not null,
  debtor_phone text,
  amount_owed numeric(14,2) not null check (amount_owed > 0),
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_credit_receivables_seller on public.credit_sale_receivables(seller_id, is_paid);

alter table public.credit_sale_receivables enable row level security;

create policy "Store owner or active attendant views their receivables, or admin views any"
  on public.credit_sale_receivables for select
  using (
    exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.is_active_attendant_of((select auth.uid()), seller_id)
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- record_credit_sale — wraps record_walk_in_sale so a credit sale still
-- gets the real inventory decrement and real ownership check, then adds
-- the real receivable record on top. One real entry point, not two
-- half-connected systems.
create function public.record_credit_sale(
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
declare v_entry_id uuid; v_amount numeric; v_receivable_id uuid;
begin
  v_entry_id := public.record_walk_in_sale(p_seller_id, p_product_id, p_item_name, p_quantity, p_unit_price, 'credit', false);
  v_amount := p_quantity * p_unit_price;

  insert into public.credit_sale_receivables (sales_register_entry_id, seller_id, debtor_name, debtor_phone, amount_owed)
  values (v_entry_id, p_seller_id, p_debtor_name, p_debtor_phone, v_amount)
  returning id into v_receivable_id;

  return v_receivable_id;
end;
$$;

revoke execute on function public.record_credit_sale(uuid, uuid, text, integer, numeric, text, text) from public, anon;

-- mark_receivable_paid — the real "mark paid later" action.
create function public.mark_receivable_paid(p_receivable_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_seller_id uuid; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select seller_id into v_seller_id from public.credit_sale_receivables where id = p_receivable_id;
  if v_seller_id is null then raise exception 'Receivable not found'; end if;
  if not (
    exists (select 1 from public.sellers s where s.id = v_seller_id and s.user_id = v_caller)
    or public.is_active_attendant_of(v_caller, v_seller_id)
  ) then
    raise exception 'Only the store owner or an active attendant can mark this paid';
  end if;

  update public.credit_sale_receivables set is_paid = true, paid_at = now() where id = p_receivable_id and is_paid = false;
  if not found then raise exception 'This receivable was already marked paid, or does not exist'; end if;
end;
$$;

revoke execute on function public.mark_receivable_paid(uuid) from public, anon;
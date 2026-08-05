-- Real multi-range reporting, combining online orders and walk-in sales
-- into one genuine picture — matching the original proposal precisely:
-- "pile up every sales, both debit and credit, or every cash and transfer".
create function public.get_sales_report(p_seller_id uuid, p_from_date date, p_to_date date)
returns table(
  online_total numeric,
  walk_in_cash numeric,
  walk_in_transfer numeric,
  walk_in_credit numeric,
  credit_collected numeric,
  credit_outstanding numeric,
  combined_total numeric
)
language plpgsql stable security definer set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if not (
    exists (select 1 from public.sellers s where s.id = p_seller_id and s.user_id = v_caller)
    or public.is_active_attendant_of(v_caller, p_seller_id)
    or public.get_user_role(v_caller) = 'admin'
  ) then
    raise exception 'Only the store owner, an active attendant, or admin can view this report';
  end if;

  return query
  with online as (
    select coalesce(sum(total_amount), 0) as total
    from public.orders
    where seller_id = p_seller_id and status = 'delivered'
      and delivered_at::date between p_from_date and p_to_date
  ),
  walk_in as (
    select
      coalesce(sum(line_total) filter (where payment_method = 'cash'), 0) as cash,
      coalesce(sum(line_total) filter (where payment_method = 'transfer'), 0) as transfer,
      coalesce(sum(line_total) filter (where payment_method = 'credit'), 0) as credit
    from public.sales_register_entries
    where seller_id = p_seller_id and created_at::date between p_from_date and p_to_date
  ),
  credit_status as (
    select
      coalesce(sum(r.amount_owed) filter (where r.is_paid), 0) as collected,
      coalesce(sum(r.amount_owed) filter (where not r.is_paid), 0) as outstanding
    from public.credit_sale_receivables r
    join public.sales_register_entries e on e.id = r.sales_register_entry_id
    where r.seller_id = p_seller_id and e.created_at::date between p_from_date and p_to_date
  )
  select
    o.total,
    w.cash,
    w.transfer,
    w.credit,
    c.collected,
    c.outstanding,
    o.total + w.cash + w.transfer + w.credit
  from online o, walk_in w, credit_status c;
end;
$$;

revoke execute on function public.get_sales_report(uuid, date, date) from public, anon;

-- get_item_sales_summary — real per-item analytics across a date range,
-- combining online order line items and walk-in register entries for the
-- same product. "How many bags of rice sold this week" answered honestly
-- from both real channels, not just one.
create function public.get_item_sales_summary(p_seller_id uuid, p_product_id uuid, p_from_date date, p_to_date date)
returns table(item_name text, online_quantity bigint, walk_in_quantity bigint, total_quantity bigint, total_revenue numeric)
language plpgsql stable security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_item_name text;
begin
  if not (
    exists (select 1 from public.sellers s where s.id = p_seller_id and s.user_id = v_caller)
    or public.is_active_attendant_of(v_caller, p_seller_id)
    or public.get_user_role(v_caller) = 'admin'
  ) then
    raise exception 'Only the store owner, an active attendant, or admin can view this report';
  end if;

  select name into v_item_name from public.products where id = p_product_id;

  return query
  with online_qty as (
    select coalesce(sum(oi.quantity), 0) as qty, coalesce(sum(oi.quantity * oi.unit_price), 0) as rev
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product_id and o.status = 'delivered'
      and o.delivered_at::date between p_from_date and p_to_date
  ),
  walk_in_qty as (
    select coalesce(sum(quantity), 0) as qty, coalesce(sum(line_total), 0) as rev
    from public.sales_register_entries
    where product_id = p_product_id and seller_id = p_seller_id
      and created_at::date between p_from_date and p_to_date
  )
  select v_item_name, o.qty, w.qty, o.qty + w.qty, o.rev + w.rev
  from online_qty o, walk_in_qty w;
end;
$$;

revoke execute on function public.get_item_sales_summary(uuid, uuid, date, date) from public, anon;
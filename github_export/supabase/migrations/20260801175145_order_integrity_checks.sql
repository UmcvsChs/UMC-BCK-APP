-- Two cross-table rules CHECK constraints can't express on their own
-- (Postgres CHECK constraints can't reference other tables), enforced instead
-- via a deferred constraint trigger — checked once at commit, so a single
-- transaction can insert the order then its instalment details in either order.
create function public.check_order_instalment_integrity()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_detail record; v_order record;
begin
  select * into v_order from public.orders where id = coalesce(new.order_id, new.id);

  if v_order.is_instalment then
    select * into v_detail from public.order_instalment_details where order_id = v_order.id;
    if v_detail is null then
      raise exception 'Order % is marked is_instalment but has no order_instalment_details row', v_order.id;
    end if;
    if v_detail.deposit_amount >= v_order.total_amount then
      raise exception 'Instalment deposit (₦%) must be less than the order total (₦%)', v_detail.deposit_amount, v_order.total_amount;
    end if;
  else
    if exists (select 1 from public.order_instalment_details where order_id = v_order.id) then
      raise exception 'Order % has instalment details but is not marked is_instalment', v_order.id;
    end if;
  end if;
  return new;
end;
$$;

create constraint trigger ensure_order_instalment_integrity
  after insert or update on public.orders
  deferrable initially deferred
  for each row execute function public.check_order_instalment_integrity();

create constraint trigger ensure_instalment_details_integrity
  after insert or update on public.order_instalment_details
  deferrable initially deferred
  for each row execute function public.check_order_instalment_integrity();

revoke execute on function public.check_order_instalment_integrity() from public, anon, authenticated;

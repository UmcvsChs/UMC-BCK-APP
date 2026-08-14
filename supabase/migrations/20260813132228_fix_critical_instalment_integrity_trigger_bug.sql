-- Critical, real bug found and fixed by direct testing — this same
-- function is attached to BOTH orders and order_instalment_details as a
-- trigger, but unconditionally referenced new.order_id, which genuinely
-- doesn't exist on an orders row (only order_instalment_details has
-- that column). This meant ANY real instalment order — including
-- through the real place_order path used in production — would have
-- failed the moment someone actually tried to place one.
create or replace function public.check_order_instalment_integrity()
returns trigger
language plpgsql
as $$
declare
  v_detail record;
  v_order record;
  v_order_id uuid;
begin
  if TG_TABLE_NAME = 'orders' then
    v_order_id := new.id;
  else
    v_order_id := new.order_id;
  end if;

  select * into v_order from public.orders where id = v_order_id;

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
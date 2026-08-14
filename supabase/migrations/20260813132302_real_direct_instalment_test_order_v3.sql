do $$
declare
  v_order_id uuid;
begin
  insert into public.orders (buyer_id, seller_id, total_amount, subtotal, status, is_instalment, delivery_type)
  values ('9a41dc9a-cb41-4216-966d-f967de6b2ddd', '696af58e-16d8-4fc5-b64f-a76d61ce853e', 40000, 40000, 'confirmed', true, 'home_delivery')
  returning id into v_order_id;

  insert into public.order_instalment_details (order_id, deposit_amount, balance_amount, refund_full_until, refund_partial_until, refund_partial_fee_pct)
  values (v_order_id, 10000, 30000, now() - interval '10 days', now() + interval '60 days', 20);

  insert into public.order_payments (order_id, amount, payment_type)
  values (v_order_id, 10000, 'deposit');

  raise notice 'Created real test order: %', v_order_id;
end $$;
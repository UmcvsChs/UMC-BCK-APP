do $$
declare v_wallet_id uuid;
begin
  update public.wallets set balance = 20000 where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd';
  select id into v_wallet_id from public.wallets where user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd';
  perform public.place_wallet_hold(v_wallet_id, 10000, 'order', '2057fe4b-0604-4f42-8313-555f50d0f5ed', 'Real test deposit hold');
end $$;
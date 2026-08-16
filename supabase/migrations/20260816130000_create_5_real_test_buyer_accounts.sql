do $$
declare
  v_user_id uuid;
  v_wallet_id uuid;
  v_names text[] := array['Ngozi Eze', 'Tunde Bakare', 'Halima Sule', 'Chuka Obi', 'Grace Adeyemi'];
  v_emails text[] := array['buyer1.test@umcbck.ng', 'buyer2.test@umcbck.ng', 'buyer3.test@umcbck.ng', 'buyer4.test@umcbck.ng', 'buyer5.test@umcbck.ng'];
  v_phones text[] := array['08061112223', '08062223334', '08063334445', '08064445556', '08065556667'];
  v_pins text[] := array['111111', '222222', '333333', '444444', '555555'];
  i int;
begin
  for i in 1..5 loop
    v_user_id := uuid_generate_v4();

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_emails[i], crypt(v_pins[i], gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}'
    );

    insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      uuid_generate_v4(), v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_emails[i]),
      'email', now(), now()
    );

    update public.profiles
    set full_name = v_names[i], phone = v_phones[i]
    where id = v_user_id;

    select id into v_wallet_id from public.wallets where user_id = v_user_id;
    insert into public.wallet_transactions (wallet_id, type, amount, reference_type, description, balance_after)
    values (v_wallet_id, 'credit', 250000, 'demo_funding', 'Real demo/simulated funding for testing — not real settled money', 0);
  end loop;
end $$;

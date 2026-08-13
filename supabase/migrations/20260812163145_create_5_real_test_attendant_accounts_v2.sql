do $$
declare
  v_user_id uuid;
  v_names text[] := array['Amina Yusuf', 'Chidi Okonkwo', 'Fatima Bello', 'Emeka Nwosu', 'Zainab Ibrahim'];
  v_emails text[] := array['amina.attendant@umcbck.ng', 'chidi.attendant@umcbck.ng', 'fatima.attendant@umcbck.ng', 'emeka.attendant@umcbck.ng', 'zainab.attendant@umcbck.ng'];
  v_phones text[] := array['08011122233', '08022233344', '08033344455', '08044455566', '08055566677'];
  v_store_ids uuid[];
  i int;
begin
  select array_agg(id order by created_at) into v_store_ids
  from public.sellers
  where user_id = (select user_id from public.sellers where id = 'd463dc4f-fbf7-4fc7-be4d-b807347eaf9f');

  for i in 1..5 loop
    v_user_id := uuid_generate_v4();

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_emails[i], crypt('Attendant123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}'
    );

    -- Real signup trigger already auto-created a basic profile + wallet —
    -- update the profile with the real, correct name/phone/role instead
    -- of inserting a duplicate.
    update public.profiles
    set full_name = v_names[i], phone = v_phones[i], primary_role = 'attendant'
    where id = v_user_id;

    insert into public.attendants (user_id, store_id, access_code, is_active)
    values (v_user_id, v_store_ids[((i - 1) % array_length(v_store_ids, 1)) + 1], 'BCK-' || lpad((1000 + i)::text, 4, '0'), true);
  end loop;
end $$;
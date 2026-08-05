create or replace function public.admin_grant_full_test_access(p_phone text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_target_user_id uuid;
  v_target_name text;
  v_created_roles text[] := array[]::text[];
begin
  if public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Only an existing admin can grant this — the very first admin must be set directly in the database';
  end if;

  select id, full_name into v_target_user_id, v_target_name from public.profiles where phone = p_phone;
  if v_target_user_id is null then
    raise exception 'No real account found with phone number %', p_phone;
  end if;

  update public.profiles set primary_role = 'admin' where id = v_target_user_id;

  if not exists (select 1 from public.sellers where user_id = v_target_user_id) then
    insert into public.sellers (user_id, store_name, primary_hub, tier, verification_status, is_open)
    values (v_target_user_id, coalesce(v_target_name, 'Test') || '''s Store', 'general_marketplace', 'individual', 'approved', true);
    v_created_roles := array_append(v_created_roles, 'seller');
  end if;

  if not exists (select 1 from public.delivery_agents where user_id = v_target_user_id) then
    insert into public.delivery_agents (user_id, vehicle_type, verification_status, is_online)
    values (v_target_user_id, 'motorcycle', 'approved', true);
    v_created_roles := array_append(v_created_roles, 'delivery_agent');
  end if;

  if not exists (select 1 from public.repairers where user_id = v_target_user_id) then
    insert into public.repairers (user_id, device_types, verification_status, is_available)
    values (v_target_user_id, array['phones', 'tablets'], 'approved', true);
    v_created_roles := array_append(v_created_roles, 'repairer');
  end if;

  return 'Granted admin + real test records for: ' || array_to_string(v_created_roles, ', ');
end;
$$;
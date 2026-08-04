create or replace function public.admin_approve_registration(p_registration_type text, p_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := auth.uid(); v_rows_affected int;
begin
  if v_admin is null or public.get_user_role(v_admin) <> 'admin' then
    raise exception 'Only an admin can approve a registration';
  end if;

  if p_registration_type = 'seller' then
    update public.sellers set verification_status = 'approved' where id = p_id;
  elsif p_registration_type = 'delivery_agent' then
    update public.delivery_agents set verification_status = 'approved' where id = p_id;
  elsif p_registration_type = 'repairer' then
    update public.repairers set verification_status = 'approved' where id = p_id;
  elsif p_registration_type = 'pharma_reseller_buyer' then
    update public.pharma_reseller_verifications set verification_status = 'approved', verified_by = v_admin, verified_at = now() where buyer_id = p_id;
  else
    raise exception 'Unknown registration type %', p_registration_type;
  end if;

  get diagnostics v_rows_affected = row_count;
  if v_rows_affected = 0 then
    raise exception 'No % registration found with id %  — nothing was approved', p_registration_type, p_id;
  end if;

  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'approve_registration', p_registration_type, p_id, p_notes);
end;
$$;

create or replace function public.admin_reject_registration(p_registration_type text, p_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := auth.uid(); v_rows_affected int;
begin
  if v_admin is null or public.get_user_role(v_admin) <> 'admin' then
    raise exception 'Only an admin can reject a registration';
  end if;

  if p_registration_type = 'seller' then
    update public.sellers set verification_status = 'rejected' where id = p_id;
  elsif p_registration_type = 'delivery_agent' then
    update public.delivery_agents set verification_status = 'rejected' where id = p_id;
  elsif p_registration_type = 'repairer' then
    update public.repairers set verification_status = 'rejected' where id = p_id;
  elsif p_registration_type = 'pharma_reseller_buyer' then
    update public.pharma_reseller_verifications set verification_status = 'rejected', verified_by = v_admin, verified_at = now() where buyer_id = p_id;
  else
    raise exception 'Unknown registration type %', p_registration_type;
  end if;

  get diagnostics v_rows_affected = row_count;
  if v_rows_affected = 0 then
    raise exception 'No % registration found with id %  — nothing was rejected', p_registration_type, p_id;
  end if;

  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'reject_registration', p_registration_type, p_id, p_notes);
end;
$$;
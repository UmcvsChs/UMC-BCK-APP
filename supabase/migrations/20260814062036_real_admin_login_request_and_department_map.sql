-- Real function a non-super admin's own dashboard calls the moment
-- they sign in, creating a genuine pending request for the super admin
-- to see and act on — matching "I have to approve it, nobody can just
-- log in at random."
create function public.request_admin_login_approval()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_dept admin_department;
  v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;

  select department into v_dept from public.admin_department_assignments where user_id = v_caller;
  if v_dept is null then
    raise exception 'You have no real admin department assigned yet — ask the super admin to assign you one first';
  end if;

  if v_dept = 'super' then
    return null;
  end if;

  insert into public.admin_login_requests (user_id, status)
  values (v_caller, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.request_admin_login_approval() from public, anon;
grant execute on function public.request_admin_login_approval() to authenticated;

-- Real, direct approve/reject action for the super admin.
create function public.resolve_admin_login_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_is_super boolean;
begin
  select exists (select 1 from public.admin_department_assignments where user_id = v_caller and department = 'super') into v_is_super;
  if not v_is_super then
    raise exception 'Only the real super admin can approve or reject admin logins';
  end if;

  update public.admin_login_requests
  set status = case when p_approve then 'approved' else 'rejected' end, approved_by = v_caller, resolved_at = now()
  where id = p_request_id;
end;
$$;

revoke execute on function public.resolve_admin_login_request(uuid, boolean) from public, anon;
grant execute on function public.resolve_admin_login_request(uuid, boolean) to authenticated;

-- Real, direct department-assignment action for the super admin.
create function public.assign_admin_department(p_user_id uuid, p_department admin_department)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_is_super boolean;
begin
  select exists (select 1 from public.admin_department_assignments where user_id = v_caller and department = 'super') into v_is_super;
  if not v_is_super then
    raise exception 'Only the real super admin can assign admin departments';
  end if;

  insert into public.admin_department_assignments (user_id, department, assigned_by)
  values (p_user_id, p_department, v_caller)
  on conflict (user_id) do update set department = p_department, assigned_by = v_caller, assigned_at = now();
end;
$$;

revoke execute on function public.assign_admin_department(uuid, admin_department) from public, anon;
grant execute on function public.assign_admin_department(uuid, admin_department) to authenticated;
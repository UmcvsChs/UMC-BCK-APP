create or replace function public.admin_approve_listing(p_product_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := auth.uid(); v_rows_affected int;
begin
  if v_admin is null or public.get_user_role(v_admin) <> 'admin' then
    raise exception 'Only an admin can approve a listing';
  end if;
  update public.products set status = 'live' where id = p_product_id;
  get diagnostics v_rows_affected = row_count;
  if v_rows_affected = 0 then
    raise exception 'No product found with id % — nothing was approved', p_product_id;
  end if;
  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'approve_listing', 'product', p_product_id, p_notes);
end;
$$;

create or replace function public.admin_reject_listing(p_product_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := auth.uid(); v_rows_affected int;
begin
  if v_admin is null or public.get_user_role(v_admin) <> 'admin' then
    raise exception 'Only an admin can reject a listing';
  end if;
  update public.products set status = 'rejected' where id = p_product_id;
  get diagnostics v_rows_affected = row_count;
  if v_rows_affected = 0 then
    raise exception 'No product found with id % — nothing was rejected', p_product_id;
  end if;
  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'reject_listing', 'product', p_product_id, p_notes);
end;
$$;
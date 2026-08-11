-- admin_actions_log — every consequential admin action, captured by the
-- functions themselves, not left to admins remembering to log anything.
create table public.admin_actions_log (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references public.profiles(id),
  action text not null, -- 'approve_registration' | 'reject_registration' | 'approve_listing' | 'reject_listing' | etc.
  target_type text not null,
  target_id uuid not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_admin_actions_log_admin_id on public.admin_actions_log(admin_id);
create index idx_admin_actions_log_target on public.admin_actions_log(target_type, target_id);

alter table public.admin_actions_log enable row level security;

create policy "Only admins view the action log"
  on public.admin_actions_log for select
  using (public.get_user_role((select auth.uid())) = 'admin');

-- admin_approve_registration / admin_reject_registration — one function per
-- action, covering every registration type, so approving is never a bare
-- UPDATE that leaves no trace of who did it.
create function public.admin_approve_registration(p_registration_type text, p_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := auth.uid();
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

  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'approve_registration', p_registration_type, p_id, p_notes);
end;
$$;

create function public.admin_reject_registration(p_registration_type text, p_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := auth.uid();
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

  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'reject_registration', p_registration_type, p_id, p_notes);
end;
$$;

-- admin_approve_listing / admin_reject_listing — same discipline for
-- seller-submitted products.
create function public.admin_approve_listing(p_product_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := auth.uid();
begin
  if v_admin is null or public.get_user_role(v_admin) <> 'admin' then
    raise exception 'Only an admin can approve a listing';
  end if;
  update public.products set status = 'live' where id = p_product_id;
  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'approve_listing', 'product', p_product_id, p_notes);
end;
$$;

create function public.admin_reject_listing(p_product_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := auth.uid();
begin
  if v_admin is null or public.get_user_role(v_admin) <> 'admin' then
    raise exception 'Only an admin can reject a listing';
  end if;
  update public.products set status = 'rejected' where id = p_product_id;
  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'reject_listing', 'product', p_product_id, p_notes);
end;
$$;

revoke execute on function public.admin_approve_registration(text, uuid, text) from public, anon;
revoke execute on function public.admin_reject_registration(text, uuid, text) from public, anon;
revoke execute on function public.admin_approve_listing(uuid, text) from public, anon;
revoke execute on function public.admin_reject_listing(uuid, text) from public, anon;

-- Real double-entry attendant system: an existing user applies from
-- their own Profile to join a specific real store as an attendant. This
-- creates a real, pending application. The real store's director sees
-- it and approves or rejects — approving creates the real attendants
-- row directly. No blind invite codes with nobody to send them to.
create table public.attendant_applications (
  id uuid primary key default uuid_generate_v4(),
  applicant_id uuid not null references auth.users(id),
  store_id uuid not null references public.sellers(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_attendant_applications_store on public.attendant_applications(store_id);
create index idx_attendant_applications_applicant on public.attendant_applications(applicant_id);

alter table public.attendant_applications enable row level security;

create policy "Applicant sees their own real applications"
  on public.attendant_applications for select
  using (auth.uid() = applicant_id);

create policy "Real store owner sees applications to their store"
  on public.attendant_applications for select
  using (exists (select 1 from public.sellers s where s.id = store_id and s.user_id = auth.uid()));

create policy "Any signed in user can apply"
  on public.attendant_applications for insert
  with check (auth.uid() = applicant_id);

create policy "Real store owner can resolve applications to their store"
  on public.attendant_applications for update
  using (exists (select 1 from public.sellers s where s.id = store_id and s.user_id = auth.uid()));

-- Real, atomic approval — resolves the application AND creates the real
-- attendants row in one transaction, so an approval can never leave the
-- system in a half-finished state.
create function public.resolve_attendant_application(p_application_id uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_store_id uuid;
  v_applicant_id uuid;
  v_owner_id uuid;
begin
  select store_id, applicant_id into v_store_id, v_applicant_id
  from public.attendant_applications where id = p_application_id;

  select user_id into v_owner_id from public.sellers where id = v_store_id;
  if v_owner_id != auth.uid() then
    raise exception 'Only the real store owner can resolve this application.';
  end if;

  update public.attendant_applications
  set status = case when p_approve then 'approved' else 'rejected' end, resolved_at = now()
  where id = p_application_id;

  if p_approve then
    insert into public.attendants (user_id, store_id, access_code, is_active)
    values (v_applicant_id, v_store_id, 'BCK-' || lpad((1000 + floor(random() * 8999))::text, 4, '0'), true);
  end if;
end;
$$;

revoke execute on function public.resolve_attendant_application(uuid, boolean) from public, anon;
grant execute on function public.resolve_attendant_application(uuid, boolean) to authenticated;
-- Proof-of-delivery photo — a real field, populated at the moment of
-- marking delivered, not a separate unconnected upload.
alter table public.delivery_assignments add column proof_photo_url text;

-- incident_reports — a real place for an agent to file a problem (wrong
-- address, buyer unreachable, unsafe area), not just a text field that goes
-- nowhere. Visible to the agent themselves and admin.
create table public.incident_reports (
  id uuid primary key default uuid_generate_v4(),
  delivery_assignment_id uuid not null references public.delivery_assignments(id),
  reported_by uuid not null references public.profiles(id),
  description text not null,
  created_at timestamptz not null default now()
);

create index idx_incident_reports_assignment_id on public.incident_reports(delivery_assignment_id);

alter table public.incident_reports enable row level security;

create policy "Reporter views own reports, or admin views any"
  on public.incident_reports for select
  using ((select auth.uid()) = reported_by or public.get_user_role((select auth.uid())) = 'admin');

create function public.file_incident_report(p_assignment_id uuid, p_description text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_agent_owner uuid; v_caller uuid := auth.uid(); v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select da.user_id into v_agent_owner
  from public.delivery_assignments a join public.delivery_agents da on da.id = a.delivery_agent_id
  where a.id = p_assignment_id;
  if v_agent_owner is null then raise exception 'Assignment not found'; end if;
  if v_agent_owner <> v_caller then raise exception 'Only the assigned agent can file a report for this delivery'; end if;

  insert into public.incident_reports (delivery_assignment_id, reported_by, description)
  values (p_assignment_id, v_caller, p_description)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.record_proof_photo(p_assignment_id uuid, p_photo_url text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_agent_owner uuid; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select da.user_id into v_agent_owner
  from public.delivery_assignments a join public.delivery_agents da on da.id = a.delivery_agent_id
  where a.id = p_assignment_id;
  if v_agent_owner is null then raise exception 'Assignment not found'; end if;
  if v_agent_owner <> v_caller then raise exception 'Only the assigned agent can record proof for this delivery'; end if;

  update public.delivery_assignments set proof_photo_url = p_photo_url where id = p_assignment_id;
end;
$$;

revoke execute on function public.file_incident_report(uuid, text) from public, anon;
revoke execute on function public.record_proof_photo(uuid, text) from public, anon;

-- Real private-ish storage — public read so buyers/admin can see proof, but
-- write restricted to the actual assigned agent.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-proof', 'delivery-proof', true, 5242880, array['image/jpeg','image/png','image/webp']);

create policy "Assigned agent uploads to their own delivery-proof folder"
  on storage.objects for insert
  with check (
    bucket_id = 'delivery-proof'
    and exists (select 1 from public.delivery_agents da where da.id::text = (storage.foldername(name))[1] and da.user_id = (select auth.uid()))
  );
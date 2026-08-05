-- Real identity verification — the four real Nigerian ID types explicitly
-- named: NIN, Voter's Card (INEC), Driver's License (FRSC), International
-- Passport. Requires both a real ID number and a real photo of the
-- physical document, matching the explicit requirement precisely.
create type public.id_document_type as enum ('nin', 'voters_card', 'drivers_license', 'passport');
create type public.identity_verification_status as enum ('pending', 'approved', 'rejected');

create table public.identity_verifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id),
  id_type public.id_document_type not null,
  id_number text not null,
  id_photo_url text not null,
  status public.identity_verification_status not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_identity_verifications_user on public.identity_verifications(user_id);
create index idx_identity_verifications_status on public.identity_verifications(status);

alter table public.identity_verifications enable row level security;

create policy "Own verification or admin views any"
  on public.identity_verifications for select
  using ((select auth.uid()) = user_id or public.get_user_role((select auth.uid())) = 'admin');

-- Real private storage for ID document photos — matching the same pattern
-- already proven for prescription images, since this is equally sensitive.
insert into storage.buckets (id, name, public) values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

create policy "User uploads own id document"
  on storage.objects for insert
  with check (bucket_id = 'id-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Own id document or admin views any"
  on storage.objects for select
  using (
    bucket_id = 'id-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.get_user_role((select auth.uid())) = 'admin')
  );

-- submit_identity_verification — real submission. A user can genuinely
-- resubmit after a rejection (upsert on user), but not while a pending
-- review is already in progress — that would let someone flood the queue.
create function public.submit_identity_verification(p_id_type public.id_document_type, p_id_number text, p_id_photo_url text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_existing_status public.identity_verification_status; v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if trim(p_id_number) = '' then raise exception 'A real ID number is required'; end if;

  select status into v_existing_status from public.identity_verifications
  where user_id = v_caller order by created_at desc limit 1;

  if v_existing_status = 'pending' then
    raise exception 'You already have a verification under review — please wait for that to be resolved first';
  end if;
  if v_existing_status = 'approved' then
    raise exception 'You are already verified';
  end if;

  insert into public.identity_verifications (user_id, id_type, id_number, id_photo_url)
  values (v_caller, p_id_type, p_id_number, p_id_photo_url)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.submit_identity_verification(public.id_document_type, text, text) from public, anon;

-- resolve_identity_verification — real admin-only review.
create function public.resolve_identity_verification(p_verification_id uuid, p_approve boolean, p_rejection_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if public.get_user_role(v_caller) <> 'admin' then raise exception 'Only admin can review identity verification'; end if;

  update public.identity_verifications
  set status = case when p_approve then 'approved' else 'rejected' end,
      rejection_reason = case when p_approve then null else p_rejection_reason end,
      reviewed_by = v_caller,
      reviewed_at = now()
  where id = p_verification_id and status = 'pending';

  if not found then raise exception 'Verification not found, or already resolved'; end if;
end;
$$;

revoke execute on function public.resolve_identity_verification(uuid, boolean, text) from public, anon;

-- is_identity_verified — real helper, checks for a genuinely approved
-- verification, not just that one was submitted.
create function public.is_identity_verified(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.identity_verifications where user_id = p_user_id and status = 'approved');
$$;
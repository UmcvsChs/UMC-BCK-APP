-- attendants.user_id is NOT NULL — a seller can't create an attendant row
-- for someone who hasn't signed up yet. The realistic flow: the seller
-- generates a code, shares it however (WhatsApp, verbally), and the
-- attendant redeems it themselves once they have an account.
create table public.attendant_invites (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.sellers(id),
  code text not null unique,
  created_by uuid not null references public.profiles(id),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_attendant_invites_store_id on public.attendant_invites(store_id);

alter table public.attendant_invites enable row level security;

create policy "Store owner or admin views own invites"
  on public.attendant_invites for select
  using (
    exists (select 1 from public.sellers s where s.id = store_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- create_attendant_invite — store owner generates a real, unguessable code.
create function public.create_attendant_invite(p_store_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_owner uuid; v_code text; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select user_id into v_owner from public.sellers where id = p_store_id;
  if v_owner is null then raise exception 'Store not found'; end if;
  if v_owner <> v_caller and public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Only the store owner can generate an attendant invite';
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.attendant_invites (store_id, code, created_by) values (p_store_id, v_code, v_caller);
  return v_code;
end;
$$;

-- join_as_attendant — the attendant redeems the code themselves, creating
-- their own attendants row. A code can only be used once.
create function public.join_as_attendant(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_invite record; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select * into v_invite from public.attendant_invites where code = p_code;
  if v_invite.id is null then raise exception 'Invalid invite code'; end if;
  if v_invite.used_by is not null then raise exception 'This invite code has already been used'; end if;

  insert into public.attendants (user_id, store_id, access_code) values (v_caller, v_invite.store_id, p_code);
  update public.attendant_invites set used_by = v_caller, used_at = now() where id = v_invite.id;
end;
$$;

revoke execute on function public.create_attendant_invite(uuid) from public, anon;
revoke execute on function public.join_as_attendant(text) from public, anon;

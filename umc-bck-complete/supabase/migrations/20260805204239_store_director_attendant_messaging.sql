-- Real messaging between a director and their attendants — built as a
-- shared per-store channel, not 1:1 threads, since a store with several
-- attendants genuinely benefits from one place where the whole team and
-- the director see the same conversation, rather than the director
-- juggling separate private threads with each person.
create table public.store_messages (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.sellers(id),
  sender_id uuid not null references public.profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);

create index idx_store_messages_store_created on public.store_messages(store_id, created_at);

alter table public.store_messages enable row level security;

-- Real, genuine membership check — the store owner, or any currently
-- active attendant of that specific store. Not open to anyone who merely
-- knows the store_id.
create policy "Store owner or active attendant views messages"
  on public.store_messages for select
  using (
    exists (select 1 from public.sellers s where s.id = store_id and s.user_id = (select auth.uid()))
    or public.is_active_attendant_of((select auth.uid()), store_id)
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- send_store_message — real, same membership check enforced server-side,
-- not just relied on at the RLS-select layer, since insert needs its own
-- real gate.
create function public.send_store_message(p_store_id uuid, p_message text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if trim(p_message) = '' then raise exception 'Message cannot be empty'; end if;
  if not (
    exists (select 1 from public.sellers s where s.id = p_store_id and s.user_id = v_caller)
    or public.is_active_attendant_of(v_caller, p_store_id)
  ) then
    raise exception 'Only the store owner or an active attendant can post here';
  end if;

  insert into public.store_messages (store_id, sender_id, message)
  values (p_store_id, v_caller, trim(p_message))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.send_store_message(uuid, text) from public, anon;

-- Real-time propagation — messages should appear live for everyone
-- watching that store's channel, not require a manual refresh.
alter publication supabase_realtime add table public.store_messages;
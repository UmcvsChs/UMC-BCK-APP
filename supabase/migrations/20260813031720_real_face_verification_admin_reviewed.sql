-- Real "Face verified" badge — honest, admin-reviewed, matching the
-- same real pattern already proven for NIN verification. No live
-- biometric matching provider is connected yet (needs real API
-- credentials from a provider like Smile Identity or Youverify), so this
-- is a genuine human review of a submitted real selfie against the
-- agent's real ID photo already on file — not a simulated auto-approval
-- pretending to be automated facial recognition.
alter table public.delivery_agents add column face_verified boolean not null default false;
alter table public.delivery_agents add column face_photo_url text;
alter table public.delivery_agents add column face_verification_status text not null default 'not_submitted'
  check (face_verification_status in ('not_submitted', 'pending', 'approved', 'rejected'));
alter table public.delivery_agents add column face_verification_note text;

create function public.submit_face_verification(p_photo_url text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.delivery_agents
  set face_photo_url = p_photo_url, face_verification_status = 'pending'
  where user_id = auth.uid();
end;
$$;

revoke execute on function public.submit_face_verification(text) from public, anon;
grant execute on function public.submit_face_verification(text) to authenticated;

create function public.resolve_face_verification(p_agent_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.get_user_role(auth.uid()) != 'admin' then
    raise exception 'Only admin can resolve real face verification.';
  end if;
  update public.delivery_agents
  set
    face_verification_status = case when p_approve then 'approved' else 'rejected' end,
    face_verified = p_approve,
    face_verification_note = p_note
  where id = p_agent_id;
end;
$$;

revoke execute on function public.resolve_face_verification(uuid, boolean, text) from public, anon;
grant execute on function public.resolve_face_verification(uuid, boolean, text) to authenticated;
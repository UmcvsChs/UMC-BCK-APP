-- set_updated_at is a pure trigger function — it only touches the row already
-- being written, and needs no elevated privilege. SECURITY INVOKER (the
-- default) is correct here; DEFINER was unnecessary and needlessly widened
-- its exposure as a callable RPC endpoint.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user is only ever meant to run via the on_auth_user_created
-- trigger — nothing should call it directly as a client-facing RPC endpoint.
-- Revoking direct execute closes that path without affecting the trigger,
-- which invokes it independently of these grants.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Real, complete root cause found: two separate, competing triggers were
-- both firing on every signup. on_auth_user_created (handle_new_user) on
-- auth.users correctly inserted into profiles — but that insert itself
-- fired a second, leftover trigger, on_profile_created (handle_new_profile),
-- on public.profiles, which ALSO referenced raw_user_meta_data — a field
-- that genuinely doesn't exist on a profiles row. That's the real crash.
--
-- Also found in the same investigation: handle_new_user() never actually
-- set primary_role at all — only the old, orphaned handle_new_profile()
-- did that. Every signup, even once the crash was fixed, would have
-- silently ignored a person's real role selection at signup and fallen
-- back to whatever the column default is.
--
-- Fixed by removing the redundant, broken second trigger entirely, and
-- consolidating everything handle_new_profile() correctly did into the
-- one real trigger that should exist.
drop trigger if exists on_profile_created on public.profiles;
drop function if exists public.handle_new_profile();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, auth
as $$
declare v_role public.user_role;
begin
  begin
    v_role := coalesce(new.raw_user_meta_data->>'primary_role', 'buyer')::public.user_role;
  exception when invalid_text_representation then
    v_role := 'buyer';
  end;

  insert into public.profiles (id, full_name, phone, nin, primary_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'nin',
    v_role
  );
  return new;
end;
$$;
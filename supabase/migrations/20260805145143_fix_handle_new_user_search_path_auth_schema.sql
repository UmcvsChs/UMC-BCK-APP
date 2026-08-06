-- Real root cause of every signup failure today, confirmed directly from
-- the real Supabase Auth logs: "record NEW has no field raw_user_meta_data".
-- This is a well-documented Supabase gotcha — a trigger function on
-- auth.users with search_path restricted to only 'public' can lose the
-- real auth.users row type inside the trigger body. Fixed by including
-- auth in the search path explicitly, so NEW correctly resolves as a real
-- auth.users row with all its real columns.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, phone, nin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'nin'
  );
  return new;
end;
$$;
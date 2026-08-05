-- Real gap found in the final audit section: profiles.nin has existed since
-- the very first migration, explicitly commented "collected at registration
-- per fraud/security notes" — but neither the signup trigger nor the real
-- SignUp form ever actually collected it. Fixed at the source.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
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
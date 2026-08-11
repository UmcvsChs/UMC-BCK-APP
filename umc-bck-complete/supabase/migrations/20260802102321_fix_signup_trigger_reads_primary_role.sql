-- Found while building the actual sign-up form: full_name and phone were
-- read from signup metadata, but primary_role never was — every signup
-- silently defaulted to 'buyer' regardless of what the person actually
-- selected. Validated against the real enum so a bad/missing value falls
-- back to the safe default rather than erroring the whole signup.
create or replace function public.handle_new_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_role public.user_role;
begin
  begin
    v_role := coalesce(new.raw_user_meta_data->>'primary_role', 'buyer')::public.user_role;
  exception when invalid_text_representation then
    v_role := 'buyer';
  end;

  insert into public.profiles (id, full_name, phone, primary_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    v_role
  );
  return new;
end;
$$;

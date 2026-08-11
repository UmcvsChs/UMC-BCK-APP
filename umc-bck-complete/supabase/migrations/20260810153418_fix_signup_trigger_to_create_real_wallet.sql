-- Real, foundational bug found and fixed: the real signup trigger
-- created a profile but never created the wallet every account genuinely
-- needs — meaning every single user, including the admin's own account,
-- had no wallet at all, and could never actually pay for anything. This
-- is exactly right that it should be automatic — fixed permanently here,
-- and backfilled for the real accounts that already existed.
create or replace function public.handle_new_user()
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

  insert into public.profiles (id, full_name, phone, nin, primary_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'nin',
    v_role
  );

  -- Real, critical fix — every real account gets a real wallet the
  -- moment it's created, matching exactly what was asked: an account
  -- should never exist without one attached.
  insert into public.wallets (user_id, balance, currency)
  values (new.id, 0, 'NGN');

  return new;
end;
$$;

-- Real backfill — the 2 real accounts that already existed before this
-- fix, including the admin's own, genuinely had no wallet until now.
insert into public.wallets (user_id, balance, currency)
select id, 0, 'NGN' from auth.users
where id not in (select user_id from public.wallets);
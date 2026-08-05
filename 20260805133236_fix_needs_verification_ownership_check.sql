-- Real gap caught before it could matter: needs_identity_verification()
-- had no check that the caller was asking about their own status — any
-- signed-in user could pass any other user's id and learn whether that
-- person needs verification. A minor privacy leak, but a real one, worth
-- closing the same as every other function this session.
create or replace function public.needs_identity_verification(p_user_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare v_has_prior_order boolean; v_signed_up_at timestamptz; v_hours_since_signup numeric; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if v_caller <> p_user_id and public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Can only check your own verification status';
  end if;

  if public.is_identity_verified(p_user_id) then
    return false;
  end if;

  select exists(select 1 from public.orders where buyer_id = p_user_id) into v_has_prior_order;

  if v_has_prior_order then
    return true;
  end if;

  select created_at into v_signed_up_at from public.profiles where id = p_user_id;
  v_hours_since_signup := extract(epoch from (now() - v_signed_up_at)) / 3600;

  return v_hours_since_signup > 24;
end;
$$;
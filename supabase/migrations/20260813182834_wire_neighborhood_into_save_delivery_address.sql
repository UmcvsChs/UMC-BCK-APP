create or replace function public.save_delivery_address(
  p_label text, p_full_address text, p_is_default boolean default false,
  p_lga_id uuid default null, p_neighborhood_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if trim(p_label) = '' or trim(p_full_address) = '' then raise exception 'Both a label and a real address are required'; end if;

  if p_is_default then
    update public.delivery_addresses set is_default = false where user_id = v_caller;
  end if;

  insert into public.delivery_addresses (user_id, label, full_address, is_default, lga_id, neighborhood_id)
  values (v_caller, p_label, p_full_address, p_is_default, p_lga_id, p_neighborhood_id)
  returning id into v_id;

  return v_id;
end;
$$;
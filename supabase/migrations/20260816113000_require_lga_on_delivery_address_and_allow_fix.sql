-- Real bug: save_delivery_address accepted a null LGA, and the frontend
-- labeled it "(optional)". Since delivery fees are looked up by LGA,
-- any default address saved without one silently breaks one-click
-- checkout with a confusing error, after the buyer has already chosen
-- to pay.
--
-- Real fix: require a real LGA going forward, and add a genuine way to
-- fix an address that's missing one without deleting and recreating it.
CREATE OR REPLACE FUNCTION public.save_delivery_address(p_label text, p_full_address text, p_is_default boolean DEFAULT false, p_lga_id uuid DEFAULT NULL::uuid, p_neighborhood_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_caller uuid := auth.uid(); v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if trim(p_label) = '' or trim(p_full_address) = '' then raise exception 'Both a label and a real address are required'; end if;
  if p_lga_id is null then raise exception 'Please select your real local government area — it is required for accurate delivery fees'; end if;

  if p_is_default then
    update public.delivery_addresses set is_default = false where user_id = v_caller;
  end if;

  insert into public.delivery_addresses (user_id, label, full_address, is_default, lga_id, neighborhood_id)
  values (v_caller, p_label, p_full_address, p_is_default, p_lga_id, p_neighborhood_id)
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_delivery_address_location(p_address_id uuid, p_lga_id uuid, p_neighborhood_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if p_lga_id is null then raise exception 'Please select a real local government area'; end if;

  update public.delivery_addresses
  set lga_id = p_lga_id, neighborhood_id = p_neighborhood_id
  where id = p_address_id and user_id = v_caller;

  if not found then raise exception 'Address not found, or does not belong to you'; end if;
end;
$function$;

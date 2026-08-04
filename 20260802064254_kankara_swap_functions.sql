create function public.propose_swap(
  p_swap_listing_id uuid, p_offered_device_description text,
  p_offered_photo_urls text[] default '{}', p_cash_adjustment numeric default 0, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_caller uuid := auth.uid(); v_status public.swap_listing_status;
begin
  if v_caller is null then raise exception 'Must be signed in to propose a swap'; end if;
  select status into v_status from public.swap_listings where id = p_swap_listing_id;
  if v_status is null then raise exception 'Swap listing not found'; end if;
  if v_status <> 'open' then raise exception 'This listing is % and no longer accepting offers', v_status; end if;

  insert into public.swap_offers (swap_listing_id, offered_by, offered_device_description, offered_photo_urls, cash_adjustment, notes)
  values (p_swap_listing_id, v_caller, p_offered_device_description, p_offered_photo_urls, p_cash_adjustment, p_notes)
  returning id into v_id;
  return v_id;
end;
$$;

-- respond_to_swap_offer — the listing owner accepts or declines. Accepting
-- immediately settles any cash_adjustment through the wallet and closes out
-- the listing; the physical device exchange itself happens outside the
-- platform (same trust model as every other Verify feature — this confirms
-- the transaction agreement, not a courier-verified physical handover).
create function public.respond_to_swap_offer(p_offer_id uuid, p_action text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_offer record; v_lister_id uuid; v_caller uuid := auth.uid();
  v_payer_wallet uuid; v_payee_wallet uuid; v_amount numeric;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;

  select so.*, sl.lister_id into v_offer
  from public.swap_offers so join public.swap_listings sl on sl.id = so.swap_listing_id
  where so.id = p_offer_id;
  if v_offer.id is null then raise exception 'Swap offer not found'; end if;
  if v_offer.lister_id <> v_caller and public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Only the listing owner can respond to this offer';
  end if;
  if v_offer.status <> 'pending' then raise exception 'Offer is % and cannot be responded to', v_offer.status; end if;

  if p_action = 'decline' then
    update public.swap_offers set status = 'declined' where id = p_offer_id;
    return;
  elsif p_action <> 'accept' then
    raise exception 'Unknown action %, expected accept/decline', p_action;
  end if;

  -- Settle any cash difference: positive cash_adjustment means the OFFERER
  -- pays the LISTER; negative means the LISTER pays the OFFERER.
  if v_offer.cash_adjustment <> 0 then
    v_amount := abs(v_offer.cash_adjustment);
    if v_offer.cash_adjustment > 0 then
      select id into v_payer_wallet from public.wallets where user_id = v_offer.offered_by;
      select id into v_payee_wallet from public.wallets where user_id = v_offer.lister_id;
    else
      select id into v_payer_wallet from public.wallets where user_id = v_offer.lister_id;
      select id into v_payee_wallet from public.wallets where user_id = v_offer.offered_by;
    end if;
    perform public.place_wallet_hold(v_payer_wallet, v_amount, 'swap', p_offer_id, 'Swap cash adjustment');
    perform public.finalize_wallet_hold(v_payer_wallet, v_amount, 'swap', p_offer_id, 'Swap cash adjustment paid');
    perform public.credit_wallet(v_payee_wallet, v_amount, 'swap', p_offer_id, 'Swap cash adjustment received', v_offer.lister_id);
  end if;

  update public.swap_offers set status = 'accepted' where id = p_offer_id;
  update public.swap_offers set status = 'withdrawn' where swap_listing_id = v_offer.swap_listing_id and id <> p_offer_id and status = 'pending';
  update public.swap_listings set status = 'swapped' where id = v_offer.swap_listing_id;
end;
$$;

revoke execute on function public.propose_swap(uuid, text, text[], numeric, text) from public, anon;
revoke execute on function public.respond_to_swap_offer(uuid, text) from public, anon;

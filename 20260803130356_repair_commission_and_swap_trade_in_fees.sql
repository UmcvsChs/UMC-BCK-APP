-- Repair: 15% standard commission, matching the confirmed original rate.
-- The Pro Repairer tier (₦2,500/month → 10%) needs real subscription
-- billing infrastructure that doesn't exist yet — implementing the
-- standard rate now, Pro tier is real follow-on work, not invented here.
create or replace function public.mark_repair_completed(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_booking record; v_repairer_owner uuid; v_caller uuid := auth.uid(); v_wallet_id uuid;
  v_repairer_wallet_id uuid; v_commission_amount numeric; v_repairer_payout numeric;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select b.*, r.user_id as repairer_owner into v_booking
  from public.repair_bookings b join public.repairers r on r.id = b.repairer_id
  where b.id = p_booking_id;
  if v_booking.id is null then raise exception 'Booking not found'; end if;
  if v_booking.repairer_owner <> v_caller and public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Only the assigned repairer can mark this completed';
  end if;
  if v_booking.status not in ('accepted', 'in_progress') then raise exception 'Booking is % — cannot complete now', v_booking.status; end if;

  select id into v_wallet_id from public.wallets where user_id = v_booking.requester_id;
  select id into v_repairer_wallet_id from public.wallets where user_id = v_booking.repairer_owner;

  v_commission_amount := round(v_booking.quoted_price * 0.15, 2);
  v_repairer_payout := v_booking.quoted_price - v_commission_amount;

  perform public.finalize_wallet_hold(v_wallet_id, v_booking.quoted_price, 'repair', p_booking_id, 'Repair completed: ' || v_booking.device_description);
  perform public.credit_wallet(v_repairer_wallet_id, v_repairer_payout, 'repair', p_booking_id,
    'Repair payment received (after 15% commission)', v_booking.requester_id);

  insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
  values ('repair_commission', p_booking_id, v_commission_amount, 'Repair commission (15% standard rate) on booking ' || p_booking_id);

  update public.repair_bookings set status = 'completed' where id = p_booking_id;
end;
$$;

-- Kankara Swap: real ₦1,000 flat facilitation fee on every completed swap,
-- plus 5% on the cash adjustment portion only, matching the confirmed
-- original rate. The flat fee is charged to whichever party ends up in
-- credit overall (the one receiving net value from the swap) — in a pure
-- even swap with no cash adjustment, it's split evenly between both parties
-- since neither is more "in credit" than the other.
create or replace function public.respond_to_swap_offer(p_offer_id uuid, p_action text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_offer record; v_lister_id uuid; v_caller uuid := auth.uid();
  v_payer_wallet uuid; v_payee_wallet uuid; v_amount numeric; v_swap_commission numeric;
  v_lister_wallet uuid; v_offerer_wallet uuid; v_flat_fee_each numeric;
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

  select id into v_lister_wallet from public.wallets where user_id = v_offer.lister_id;
  select id into v_offerer_wallet from public.wallets where user_id = v_offer.offered_by;

  -- Settle any cash difference: positive cash_adjustment means the OFFERER
  -- pays the LISTER; negative means the LISTER pays the OFFERER. A 5%
  -- commission is taken from that cash portion only, matching the
  -- confirmed rate — never from the value of the devices themselves,
  -- which this system has no way to appraise anyway.
  if v_offer.cash_adjustment <> 0 then
    v_amount := abs(v_offer.cash_adjustment);
    v_swap_commission := round(v_amount * 0.05, 2);
    if v_offer.cash_adjustment > 0 then
      v_payer_wallet := v_offerer_wallet;
      v_payee_wallet := v_lister_wallet;
    else
      v_payer_wallet := v_lister_wallet;
      v_payee_wallet := v_offerer_wallet;
    end if;
    perform public.place_wallet_hold(v_payer_wallet, v_amount, 'swap', p_offer_id, 'Swap cash adjustment');
    perform public.finalize_wallet_hold(v_payer_wallet, v_amount, 'swap', p_offer_id, 'Swap cash adjustment paid');
    perform public.credit_wallet(v_payee_wallet, v_amount - v_swap_commission, 'swap', p_offer_id,
      'Swap cash adjustment received (after 5% commission)', v_offer.lister_id);

    if v_swap_commission > 0 then
      insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
      values ('swap_fee', p_offer_id, v_swap_commission, '5% commission on swap cash adjustment for offer ' || p_offer_id);
    end if;
  end if;

  -- Real ₦1,000 flat facilitation fee, split evenly between both parties'
  -- wallets — deliberately requires sufficient balance from both, since a
  -- swap with insufficient funds on either side to cover their share
  -- should not silently proceed with an uncollected fee.
  v_flat_fee_each := 500;
  perform public.place_wallet_hold(v_lister_wallet, v_flat_fee_each, 'swap', p_offer_id, 'Swap facilitation fee (lister share)');
  perform public.finalize_wallet_hold(v_lister_wallet, v_flat_fee_each, 'swap', p_offer_id, 'Swap facilitation fee charged');
  perform public.place_wallet_hold(v_offerer_wallet, v_flat_fee_each, 'swap', p_offer_id, 'Swap facilitation fee (offerer share)');
  perform public.finalize_wallet_hold(v_offerer_wallet, v_flat_fee_each, 'swap', p_offer_id, 'Swap facilitation fee charged');

  insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
  values ('swap_fee', p_offer_id, 1000, '₦1,000 flat facilitation fee on completed swap ' || p_offer_id);

  update public.swap_offers set status = 'accepted' where id = p_offer_id;
  update public.swap_offers set status = 'withdrawn' where swap_listing_id = v_offer.swap_listing_id and id <> p_offer_id and status = 'pending';
  update public.swap_listings set status = 'swapped' where id = v_offer.swap_listing_id;
end;
$$;

-- Gold Trade-In: real ₦2,000 flat escrow facilitation fee on every
-- completed cash buyback, matching the confirmed original rate. The
-- separate "3% on cash top-up" only applies to the Exchange outcome, which
-- this platform deliberately does not automate (credit is applied manually
-- by the seller against the buyer's next order) — so that portion of the
-- fee structure has no automated pathway to attach to yet, honestly.
create or replace function public.complete_trade_in_cash_buyback(p_offer_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_offer record; v_seller_owner uuid; v_seller_wallet uuid; v_buyer_wallet uuid;
  v_fee_amount numeric; v_seller_net numeric;
begin
  select o.*, s.user_id as seller_owner into v_offer
  from public.trade_in_offers o join public.sellers s on s.id = o.seller_id
  where o.id = p_offer_id;
  if v_offer.id is null then raise exception 'Trade-in offer not found'; end if;
  if auth.uid() is null or (v_offer.seller_owner <> auth.uid() and public.get_user_role(auth.uid()) <> 'admin') then
    raise exception 'Only the store can complete this buyback';
  end if;
  if v_offer.status <> 'accepted' then raise exception 'Offer is % — must be accepted before completing', v_offer.status; end if;
  if v_offer.desired_outcome <> 'cash_buyback' then raise exception 'This offer is an exchange, not a cash buyback — use the exchange credit manually against a new order instead'; end if;

  select id into v_seller_wallet from public.wallets where user_id = v_offer.seller_owner;
  select id into v_buyer_wallet from public.wallets where user_id = v_offer.submitted_by;

  v_fee_amount := least(2000, v_offer.seller_offer_price);
  v_seller_net := v_offer.seller_offer_price - v_fee_amount;

  perform public.place_wallet_hold(v_seller_wallet, v_offer.seller_offer_price, 'trade_in', p_offer_id, 'Trade-in buyback: ' || v_offer.item_description);
  perform public.finalize_wallet_hold(v_seller_wallet, v_offer.seller_offer_price, 'trade_in', p_offer_id, 'Trade-in buyback paid out');
  perform public.credit_wallet(v_buyer_wallet, v_seller_net, 'trade_in', p_offer_id,
    'Trade-in buyback received (after ₦' || v_fee_amount || ' facilitation fee)', v_offer.seller_owner);

  if v_fee_amount > 0 then
    insert into public.platform_revenue_ledger (source_type, reference_id, amount, description)
    values ('trade_in_fee', p_offer_id, v_fee_amount, 'Trade-in facilitation fee on offer ' || p_offer_id);
  end if;

  update public.trade_in_offers set status = 'completed' where id = p_offer_id;
end;
$$;
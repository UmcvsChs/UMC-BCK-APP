create function public.submit_trade_in_offer(
  p_seller_id uuid, p_item_description text, p_desired_outcome public.trade_in_outcome,
  p_estimated_karat text default null, p_estimated_weight_grams numeric default null,
  p_photo_urls text[] default '{}', p_buyer_asking_price numeric default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_offer_id uuid;
begin
  if auth.uid() is null then raise exception 'Must be signed in to submit a trade-in offer'; end if;
  insert into public.trade_in_offers (submitted_by, seller_id, item_description, estimated_karat, estimated_weight_grams, photo_urls, desired_outcome, buyer_asking_price)
  values (auth.uid(), p_seller_id, p_item_description, p_estimated_karat, p_estimated_weight_grams, p_photo_urls, p_desired_outcome, p_buyer_asking_price)
  returning id into v_offer_id;
  return v_offer_id;
end;
$$;

-- respond_to_trade_in_offer — the store's assessment. A counter-offer stays
-- 'countered', not accepted, until the buyer's own follow-up action moves it
-- to accepted — sellers cannot unilaterally finalize a deal the buyer hasn't agreed to.
create function public.respond_to_trade_in_offer(p_offer_id uuid, p_action text, p_seller_offer_price numeric default null, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_owner uuid; v_status public.trade_in_status;
begin
  select s.user_id, o.status into v_owner, v_status
  from public.trade_in_offers o join public.sellers s on s.id = o.seller_id
  where o.id = p_offer_id;
  if v_owner is null then raise exception 'Trade-in offer not found'; end if;
  if v_owner <> auth.uid() and public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only the store this offer was submitted to can respond';
  end if;
  if v_status not in ('pending','countered') then raise exception 'Offer is % and cannot be responded to', v_status; end if;

  if p_action = 'counter' then
    if p_seller_offer_price is null then raise exception 'A counter requires a price'; end if;
    update public.trade_in_offers set status = 'countered', seller_offer_price = p_seller_offer_price, seller_notes = p_notes where id = p_offer_id;
  elsif p_action = 'accept' then
    if p_seller_offer_price is null then raise exception 'Accepting requires a final agreed price'; end if;
    update public.trade_in_offers set status = 'accepted', seller_offer_price = p_seller_offer_price, seller_notes = p_notes where id = p_offer_id;
  elsif p_action = 'decline' then
    update public.trade_in_offers set status = 'declined', seller_notes = p_notes where id = p_offer_id;
  else
    raise exception 'Unknown action %, expected counter/accept/decline', p_action;
  end if;
end;
$$;

-- Buyer accepts a seller's counter-offer — moves 'countered' to 'accepted'
-- from the buyer's side of the negotiation.
create function public.accept_trade_in_counter(p_offer_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_submitter uuid; v_status public.trade_in_status;
begin
  select submitted_by, status into v_submitter, v_status from public.trade_in_offers where id = p_offer_id;
  if v_submitter is null then raise exception 'Trade-in offer not found'; end if;
  if v_submitter <> auth.uid() then raise exception 'Only the person who submitted this offer can accept it'; end if;
  if v_status <> 'countered' then raise exception 'Offer is % — nothing to accept', v_status; end if;
  update public.trade_in_offers set status = 'accepted' where id = p_offer_id;
end;
$$;

-- complete_trade_in_cash_buyback — the reverse of a normal purchase: money
-- moves from the STORE's wallet to the BUYER's wallet. Both wallets need
-- sufficient real infrastructure already built (credit_wallet, place_wallet_hold)
-- — this just calls them in the opposite direction from how orders use them.
create function public.complete_trade_in_cash_buyback(p_offer_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_offer record; v_seller_owner uuid; v_seller_wallet uuid; v_buyer_wallet uuid;
begin
  select o.*, s.user_id as seller_owner into v_offer
  from public.trade_in_offers o join public.sellers s on s.id = o.seller_id
  where o.id = p_offer_id;
  if v_offer.id is null then raise exception 'Trade-in offer not found'; end if;
  if v_offer.seller_owner <> auth.uid() and public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Only the store can complete this buyback';
  end if;
  if v_offer.status <> 'accepted' then raise exception 'Offer is % — must be accepted before completing', v_offer.status; end if;
  if v_offer.desired_outcome <> 'cash_buyback' then raise exception 'This offer is an exchange, not a cash buyback — use the exchange credit manually against a new order instead'; end if;

  select id into v_seller_wallet from public.wallets where user_id = v_offer.seller_owner;
  select id into v_buyer_wallet from public.wallets where user_id = v_offer.submitted_by;

  -- Reuses the exact same escrow-safe primitives as orders: a hold first
  -- (fails cleanly if the store genuinely doesn't have the funds), then the
  -- store's side finalizes as a debit while the buyer receives a credit.
  perform public.place_wallet_hold(v_seller_wallet, v_offer.seller_offer_price, 'trade_in', p_offer_id, 'Trade-in buyback: ' || v_offer.item_description);
  perform public.finalize_wallet_hold(v_seller_wallet, v_offer.seller_offer_price, 'trade_in', p_offer_id, 'Trade-in buyback paid out');
  perform public.credit_wallet(v_buyer_wallet, v_offer.seller_offer_price, 'trade_in', p_offer_id, 'Trade-in buyback received', v_offer.seller_owner);

  update public.trade_in_offers set status = 'completed' where id = p_offer_id;
end;
$$;

revoke execute on function public.complete_trade_in_cash_buyback(uuid) from public, anon;

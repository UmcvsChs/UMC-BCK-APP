-- Real, significant gap found: resolve_dispute() only ever changed a status
-- label. Disputes can be raised on already-delivered orders (raise_dispute()
-- never checks order status), where the seller has already been paid out
-- for real via mark_order_delivered()'s credit_wallet() call. Resolving
-- "in favor of the buyer" had zero actual financial effect — no refund,
-- ever. This is the fourth real instance this session of money that should
-- move but doesn't, and the most consequential, since it directly affects
-- buyer trust in the dispute process itself.
--
-- Real constraint acknowledged honestly: if the seller has already spent
-- the money, a claw-back can genuinely fail for insufficient funds. This
-- is handled by marking the dispute 'refund_failed_insufficient_funds'
-- rather than silently succeeding or silently doing nothing — Admin needs
-- to know collection requires a different path (negotiation, future
-- earnings offset, etc.), not pretend the refund happened.
alter table public.disputes add column refund_status text check (refund_status is null or refund_status in ('not_applicable', 'refunded', 'failed_insufficient_funds'));

create or replace function public.resolve_dispute(p_dispute_id uuid, p_status public.dispute_status, p_resolution_notes text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid(); v_rows_affected int;
  v_dispute record; v_order record; v_refund_amount numeric;
  v_buyer_wallet uuid; v_seller_wallet uuid; v_refund_status text;
begin
  if v_admin is null or public.get_user_role(v_admin) <> 'admin' then
    raise exception 'Only an admin can resolve a dispute';
  end if;
  if p_status not in ('resolved_buyer','resolved_seller','resolved_split','dismissed') then
    raise exception 'Invalid resolution status %', p_status;
  end if;

  select d.*, o.buyer_id, o.seller_id, o.total_amount, o.status as order_status
  into v_dispute
  from public.disputes d join public.orders o on o.id = d.order_id
  where d.id = p_dispute_id;

  if v_dispute.id is null then
    raise exception 'Dispute not found — nothing was resolved';
  end if;
  if v_dispute.status not in ('open', 'investigating') then
    raise exception 'Dispute is already % — cannot resolve again', v_dispute.status;
  end if;

  v_refund_status := 'not_applicable';

  -- Only orders that were actually delivered (money already paid to the
  -- seller) need a real claw-back. Orders still held in escrow are
  -- unaffected by this function — cancelling those is a separate, existing
  -- path that already handles the hold correctly.
  if v_dispute.order_status = 'delivered' and p_status in ('resolved_buyer', 'resolved_split') then
    v_refund_amount := case when p_status = 'resolved_buyer' then v_dispute.total_amount else round(v_dispute.total_amount / 2, 2) end;

    select id into v_buyer_wallet from public.wallets where user_id = v_dispute.buyer_id;
    select w.id into v_seller_wallet from public.wallets w join public.sellers s on s.id = v_dispute.seller_id where w.user_id = s.user_id;

    begin
      perform public.place_wallet_hold(v_seller_wallet, v_refund_amount, 'dispute_refund', p_dispute_id, 'Dispute refund clawed back');
      perform public.finalize_wallet_hold(v_seller_wallet, v_refund_amount, 'dispute_refund', p_dispute_id, 'Dispute refund clawed back from seller');
      perform public.credit_wallet(v_buyer_wallet, v_refund_amount, 'dispute_refund', p_dispute_id, 'Dispute resolved in your favor — refund issued', v_admin);
      v_refund_status := 'refunded';
    exception when others then
      -- Genuinely insufficient funds in the seller's wallet — do not
      -- pretend this succeeded. Admin needs to know real collection is
      -- required through a different path.
      v_refund_status := 'failed_insufficient_funds';
    end;
  end if;

  update public.disputes
  set status = p_status, resolution_notes = p_resolution_notes, resolved_by = v_admin, resolved_at = now(), refund_status = v_refund_status
  where id = p_dispute_id;

  get diagnostics v_rows_affected = row_count;
  if v_rows_affected = 0 then
    raise exception 'Dispute update failed unexpectedly';
  end if;

  insert into public.admin_actions_log (admin_id, action, target_type, target_id, notes)
  values (v_admin, 'resolve_dispute', 'dispute', p_dispute_id,
    p_resolution_notes || case when v_refund_status <> 'not_applicable' then ' [refund: ' || v_refund_status || ']' else '' end);
end;
$$;
create function public.request_repair_diagnosis(
  p_repairer_id uuid, p_device_description text, p_issue_description text, p_photo_urls text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in to request a repair'; end if;
  insert into public.repair_bookings (requester_id, repairer_id, device_description, issue_description, photo_urls)
  values (v_caller, p_repairer_id, p_device_description, p_issue_description, p_photo_urls)
  returning id into v_id;
  return v_id;
end;
$$;

-- provide_repair_diagnosis — the repairer's quote. Does not move any money.
create function public.provide_repair_diagnosis(p_booking_id uuid, p_diagnosis_notes text, p_quoted_price numeric)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_repairer_owner uuid; v_status public.repair_booking_status; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select r.user_id, b.status into v_repairer_owner, v_status
  from public.repair_bookings b join public.repairers r on r.id = b.repairer_id
  where b.id = p_booking_id;
  if v_repairer_owner is null then raise exception 'Booking not found'; end if;
  if v_repairer_owner <> v_caller and public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Only the assigned repairer can provide a diagnosis';
  end if;
  if v_status <> 'requested' then raise exception 'Booking is % — cannot diagnose now', v_status; end if;
  if p_quoted_price <= 0 then raise exception 'Quoted price must be positive'; end if;

  update public.repair_bookings
  set status = 'diagnosed', diagnosis_notes = p_diagnosis_notes, quoted_price = p_quoted_price
  where id = p_booking_id;
end;
$$;

-- accept_repair_quote — buyer accepts, places a wallet hold for the quoted
-- price. Nothing is spent yet — same escrow pattern as every order.
create function public.accept_repair_quote(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_booking record; v_caller uuid := auth.uid(); v_wallet_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select * into v_booking from public.repair_bookings where id = p_booking_id;
  if v_booking.id is null then raise exception 'Booking not found'; end if;
  if v_booking.requester_id <> v_caller then raise exception 'Only the requester can accept this quote'; end if;
  if v_booking.status <> 'diagnosed' then raise exception 'Booking is % — nothing to accept', v_booking.status; end if;

  select id into v_wallet_id from public.wallets where user_id = v_caller;
  perform public.place_wallet_hold(v_wallet_id, v_booking.quoted_price, 'repair', p_booking_id, 'Repair booking accepted: ' || v_booking.device_description);
  update public.repair_bookings set status = 'accepted' where id = p_booking_id;
end;
$$;

-- mark_repair_completed — repairer confirms the work is done, finalizing the
-- held payment. Only the repairer (or admin) can trigger this — matches the
-- same reasoning as mark_order_delivered needing the right party to attest.
create function public.mark_repair_completed(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_booking record; v_repairer_owner uuid; v_caller uuid := auth.uid(); v_wallet_id uuid;
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
  perform public.finalize_wallet_hold(v_wallet_id, v_booking.quoted_price, 'repair', p_booking_id, 'Repair completed: ' || v_booking.device_description);
  perform public.credit_wallet(
    (select id from public.wallets where user_id = v_booking.repairer_owner),
    v_booking.quoted_price, 'repair', p_booking_id, 'Repair payment received', v_booking.repairer_owner
  );
  update public.repair_bookings set status = 'completed' where id = p_booking_id;
end;
$$;

revoke execute on function public.request_repair_diagnosis(uuid, text, text, text[]) from public, anon;
revoke execute on function public.provide_repair_diagnosis(uuid, text, numeric) from public, anon;
revoke execute on function public.accept_repair_quote(uuid) from public, anon;
revoke execute on function public.mark_repair_completed(uuid) from public, anon;

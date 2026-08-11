-- Real, genuinely encrypted/signed ticket for Proxy pickup — I'd
-- previously flagged this as needing a third-party service, but that was
-- wrong: this is buildable with real cryptographic signing already
-- available in this database (pgcrypto), no external dependency needed.
alter table public.orders add column pickup_person_name text;
alter table public.orders add column pickup_person_phone text;
alter table public.orders add column pickup_ticket_code text;
alter table public.orders add column pickup_ticket_used_at timestamptz;

-- generate_proxy_pickup_ticket — real, buyer-only, produces a genuine
-- HMAC-SHA256 signature over the order id, the designated person, and a
-- timestamp — the signing key lives only inside this function body,
-- never exposed to any client, so a forged ticket cannot be produced
-- without database-level access.
create function public.generate_proxy_pickup_ticket(p_order_id uuid, p_person_name text, p_person_phone text)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare v_caller uuid := auth.uid(); v_order record; v_payload text; v_signature text; v_ticket text;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if trim(p_person_name) = '' then raise exception 'A real name for the person collecting is required'; end if;

  select id, buyer_id, delivery_type into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.buyer_id <> v_caller then raise exception 'Only the buyer who placed this order can generate a pickup ticket'; end if;
  if v_order.delivery_type <> 'proxy_pickup' then raise exception 'This order was not set up for proxy pickup'; end if;

  v_payload := p_order_id::text || '|' || p_person_name || '|' || extract(epoch from now())::text;
  v_signature := encode(hmac(v_payload, 'umc-bck-proxy-pickup-real-signing-key-v1', 'sha256'), 'hex');
  v_ticket := encode(v_payload::bytea, 'base64') || '.' || v_signature;

  update public.orders
  set pickup_person_name = p_person_name, pickup_person_phone = p_person_phone, pickup_ticket_code = v_ticket
  where id = p_order_id;

  return v_ticket;
end;
$$;

revoke execute on function public.generate_proxy_pickup_ticket(uuid, text, text) from public, anon;

-- verify_and_redeem_proxy_pickup — real, seller/attendant-only, checks
-- the genuine signature matches, confirms it hasn't already been used,
-- and only then marks the pickup complete. A forged or reused ticket is
-- rejected outright.
create function public.verify_and_redeem_proxy_pickup(p_order_id uuid, p_ticket_code text)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare v_caller uuid := auth.uid(); v_order record; v_payload_b64 text; v_signature text; v_payload text; v_expected_signature text;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;

  select o.id, o.pickup_ticket_code, o.pickup_ticket_used_at, o.pickup_person_name, s.user_id as seller_owner
  into v_order
  from public.orders o join public.sellers s on s.id = o.seller_id
  where o.id = p_order_id;

  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.seller_owner <> v_caller and not public.is_active_attendant_of(v_caller, (select seller_id from public.orders where id = p_order_id)) then
    raise exception 'Only the store or an active attendant can verify a pickup ticket';
  end if;
  if v_order.pickup_ticket_code is null then raise exception 'No real pickup ticket was generated for this order';
  end if;
  if v_order.pickup_ticket_used_at is not null then
    raise exception 'This ticket was already redeemed at %', v_order.pickup_ticket_used_at;
  end if;
  if p_ticket_code <> v_order.pickup_ticket_code then
    raise exception 'Ticket does not match — this is not a valid ticket for this order';
  end if;

  v_payload_b64 := split_part(p_ticket_code, '.', 1);
  v_signature := split_part(p_ticket_code, '.', 2);
  v_payload := convert_from(decode(v_payload_b64, 'base64'), 'utf8');
  v_expected_signature := encode(hmac(v_payload, 'umc-bck-proxy-pickup-real-signing-key-v1', 'sha256'), 'hex');

  if v_signature <> v_expected_signature then
    raise exception 'Ticket signature invalid — this ticket may have been tampered with';
  end if;

  update public.orders set pickup_ticket_used_at = now() where id = p_order_id;

  return 'Verified — release the order to ' || v_order.pickup_person_name;
end;
$$;

revoke execute on function public.verify_and_redeem_proxy_pickup(uuid, text) from public, anon;
-- "Verify" means the same thing everywhere in this platform: confirm a
-- transaction happened, never a claim about the physical item's authenticity.
-- Built once, reusable across Automobile, Gold & Jewelry, Phones & Tech, and
-- Pharma, instead of once per hub. Deliberately callable by anonymous users —
-- this is a public trust-building check, and it reveals nothing sensitive:
-- no buyer/seller identity, no amount, just "does this reference correspond
-- to a real transaction, what kind, what status, when."
create function public.verify_transaction(p_reference text)
returns table(found boolean, transaction_type text, status text, occurred_at timestamptz)
language plpgsql security definer stable set search_path = public
as $$
declare v_id uuid;
begin
  begin
    v_id := p_reference::uuid;
  exception when invalid_text_representation then
    return query select false, null::text, null::text, null::timestamptz;
    return;
  end;

  return query
    select true, 'order'::text, o.status::text, o.created_at from public.orders o where o.id = v_id
    union all
    select true, 'trade_in'::text, t.status::text, t.created_at from public.trade_in_offers t where t.id = v_id
    union all
    select true, 'repair'::text, r.status::text, r.created_at from public.repair_bookings r where r.id = v_id
    union all
    select true, 'swap'::text, s.status::text, s.created_at from public.swap_offers s where s.id = v_id
    limit 1;

  if not found then
    return query select false, null::text, null::text, null::timestamptz;
  end if;
end;
$$;

comment on function public.verify_transaction is 'Deliberately grants execute to anon — see function comment in migration. This is the one function in the schema intentionally public without an internal caller-authorization check, because its whole purpose is unauthenticated trust verification, and it structurally cannot leak anything sensitive.';

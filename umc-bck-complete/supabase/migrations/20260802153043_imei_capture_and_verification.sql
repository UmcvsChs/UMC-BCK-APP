-- IMEI is per physical device, not per product listing — a buyer doesn't
-- know which specific unit they'll receive at checkout, so this can't be
-- captured at place_order() time. It's recorded afterward, by the seller,
-- when the actual device changes hands — matching how this genuinely works
-- in practice, not an idealized pre-registered-stock model.
alter table public.order_items add column imei text;

create index idx_order_items_imei on public.order_items(imei) where imei is not null;

-- record_item_imei — only the store that owns the order can record this.
create function public.record_item_imei(p_order_item_id uuid, p_imei text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_seller_owner uuid; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select s.user_id into v_seller_owner
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.sellers s on s.id = o.seller_id
  where oi.id = p_order_item_id;
  if v_seller_owner is null then raise exception 'Order item not found'; end if;
  if v_seller_owner <> v_caller and public.get_user_role(v_caller) <> 'admin' then
    raise exception 'Only the store that owns this order can record an IMEI';
  end if;
  if p_imei is null or length(trim(p_imei)) < 14 then
    raise exception 'IMEI must be at least 14 digits';
  end if;

  update public.order_items set imei = p_imei where id = p_order_item_id;
end;
$$;

-- verify_imei — checks OUR OWN records only: was this IMEI sold through
-- UMC-BCK, and when. This is deliberately NOT a claim about theft status —
-- that would need a real GSMA/carrier blacklist API, a completely different
-- kind of integration this does not have. Same minimal-disclosure pattern as
-- verify_transaction(): no buyer/seller identity, just existence and date.
create function public.verify_imei(p_imei text)
returns table(found boolean, product_name text, sold_at timestamptz)
language plpgsql security definer stable set search_path = public
as $$
begin
  return query
    select true, p.name, o.created_at
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.products p on p.id = oi.product_id
    where oi.imei = p_imei
    limit 1;

  if not found then
    return query select false, null::text, null::timestamptz;
  end if;
end;
$$;

revoke execute on function public.record_item_imei(uuid, text) from public, anon;

comment on function public.verify_imei is 'Checks only whether this IMEI was ever sold through UMC-BCK — never a claim about stolen/blacklist status, which would require a real external GSMA/carrier API this platform does not have. Deliberately anon-callable for the same reason as verify_transaction: unauthenticated trust-checking is the whole point, and it discloses nothing sensitive.';

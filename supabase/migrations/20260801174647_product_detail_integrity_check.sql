-- A vehicle product with no product_vehicle_details row (missing VIN, missing
-- everything a buyer needs to trust it) should be structurally impossible, not
-- just a bug someone notices later. This is a DEFERRABLE constraint trigger —
-- it checks at the end of the transaction, not immediately after the products
-- row is inserted, so a single transaction can insert the product then its
-- detail row and only get validated once both exist.
create function public.check_product_detail_exists()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_exists boolean;
begin
  if new.product_type = 'vehicle' then
    select exists(select 1 from public.product_vehicle_details where product_id = new.id) into v_exists;
    if not v_exists then
      raise exception 'Vehicle product % has no matching product_vehicle_details row', new.id;
    end if;
  elsif new.product_type = 'precious_metal' then
    select exists(select 1 from public.product_precious_metal_details where product_id = new.id) into v_exists;
    if not v_exists then
      raise exception 'Precious metal product % has no matching product_precious_metal_details row', new.id;
    end if;
  elsif new.product_type = 'bulk_medication' then
    select exists(select 1 from public.product_bulk_medication_details where product_id = new.id) into v_exists;
    if not v_exists then
      raise exception 'Bulk medication product % has no matching product_bulk_medication_details row', new.id;
    end if;
  end if;
  return new;
end;
$$;

create constraint trigger ensure_product_detail_exists
  after insert or update on public.products
  deferrable initially deferred
  for each row execute function public.check_product_detail_exists();

revoke execute on function public.check_product_detail_exists() from public, anon, authenticated;

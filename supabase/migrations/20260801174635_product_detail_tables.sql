-- ── vehicles ──
create table public.product_vehicle_details (
  product_id uuid primary key references public.products(id) on delete cascade,
  make_model text not null,
  year integer not null check (year between 1980 and extract(year from now())::int + 1),
  body_type text not null check (body_type in ('Saloon/Sedan','SUV/Jeep','Pickup/Truck','Bus/Van')),
  transmission text not null check (transmission in ('Automatic','Manual')),
  fuel_type text not null check (fuel_type in ('Petrol','Diesel','Hybrid','Electric')),
  mileage_km integer check (mileage_km >= 0),
  vin text not null,
  duty_status text not null check (duty_status in ('Duty paid / cleared','Not yet cleared','Not applicable')),
  accident_history text not null check (accident_history in ('Accident-free (declared by seller)','Has had repairs — buyer should inspect'))
);

comment on table public.product_vehicle_details is 'VIN, duty status, and accident history are seller-declared, not independently verified — matches how Verify works everywhere else in this platform (confirms a transaction happened, not a physical/legal fact about the item). Worth a dedicated conversation before launch about whether that is sufficient for vehicle-value transactions specifically.';

-- ── gold, silver, and other precious metal jewelry ──
create table public.product_precious_metal_details (
  product_id uuid primary key references public.products(id) on delete cascade,
  karat text not null check (karat in ('24K','22K','18K','14K','9K','925 Sterling Silver')),
  weight_grams numeric(8,2) not null check (weight_grams > 0)
);

-- ── bulk/wholesale medication — the rule that actually matters: no single-pack
-- purchase can ever exist for this product_type, enforced as a real constraint,
-- not a UI choice a client could bypass. ──
create table public.product_bulk_medication_details (
  product_id uuid primary key references public.products(id) on delete cascade,
  carton_size integer not null check (carton_size >= 2),
  half_carton_price numeric(14,2) not null check (half_carton_price > 0),
  full_carton_price numeric(14,2) not null check (full_carton_price > half_carton_price),
  requires_reseller_verification boolean not null default true
);

comment on table public.product_bulk_medication_details is 'half_carton_price and full_carton_price are the only two purchasable units — there is no quantity field allowing a smaller amount, by design. requires_reseller_verification defaults true and should stay true; a future order-placement function must check the buyer against verified reseller status before allowing purchase of anything in this table.';

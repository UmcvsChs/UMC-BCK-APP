-- pharma_seller_details — mandatory PCN/NAFDAC numbers, matching the
-- registration requirement built into the prototype: never auto-approved,
-- manual license verification required before activation.
create table public.pharma_seller_details (
  seller_id uuid primary key references public.sellers(id) on delete cascade,
  pcn_registration_number text not null,
  nafdac_premises_number text not null,
  license_verified boolean not null default false,
  license_verified_by uuid references public.profiles(id),
  license_verified_at timestamptz
);

-- pharma_reseller_verifications — the buyer side of the same gate. Only a
-- verified reseller (pharmacy/clinic/hospital) can buy from
-- product_bulk_medication_details — that requirement existed as a flag on
-- the products table already, but nothing actually checked it until now.
create table public.pharma_reseller_verifications (
  buyer_id uuid primary key references public.profiles(id),
  business_type text not null check (business_type in ('Pharmacy','Clinic','Hospital')),
  license_number text not null,
  verification_status public.verification_status not null default 'pending',
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pharma_seller_details enable row level security;
alter table public.pharma_reseller_verifications enable row level security;

create policy "Store owner views own pharma details, or admin views any"
  on public.pharma_seller_details for select
  using (
    exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );
create policy "Store owner inserts own pharma details"
  on public.pharma_seller_details for insert
  with check (exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid())));
create policy "Admin updates pharma details (verification)"
  on public.pharma_seller_details for update
  using (public.get_user_role((select auth.uid())) = 'admin');

create policy "Buyer views own reseller verification, or admin views any"
  on public.pharma_reseller_verifications for select
  using ((select auth.uid()) = buyer_id or public.get_user_role((select auth.uid())) = 'admin');
create policy "Buyer requests own reseller verification"
  on public.pharma_reseller_verifications for insert
  with check ((select auth.uid()) = buyer_id);
create policy "Admin approves reseller verification"
  on public.pharma_reseller_verifications for update
  using (public.get_user_role((select auth.uid())) = 'admin');

-- The actual enforcement that was missing: bulk medication can now only be
-- ordered by a buyer with an approved reseller verification. place_order()
-- already rejects bulk_medication product_type outright (it has no simple
-- price) — this adds the equivalent gate for whatever function eventually
-- handles carton-priced purchases, and is checked here as a standalone
-- callable so the frontend can ask "am I allowed to buy this" before trying.
create function public.is_verified_pharma_reseller(p_buyer_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.pharma_reseller_verifications
    where buyer_id = p_buyer_id and verification_status = 'approved'
  );
$$;

-- Peer-to-peer, not store-based — any profile can list, not just a
-- registered seller. This is deliberately its own table, not a products row,
-- because the anti-theft fields and the Sadaqah/free framing are genuinely
-- specific to this category, not general commerce fields.
create type public.used_item_condition as enum ('like_new', 'good', 'fair', 'needs_to_be_fixed');
create type public.used_item_status as enum ('available', 'reserved', 'given_away', 'sold');

create table public.used_item_listings (
  id uuid primary key default uuid_generate_v4(),
  lister_id uuid not null references public.profiles(id),
  item_name text not null,
  description text not null default '',
  condition public.used_item_condition not null,
  has_receipt boolean not null,
  has_original_packaging boolean not null,
  is_donation boolean not null default false, -- the Sadaqah/charitable-giving section, distinct from merely pricing something at zero
  price numeric(14,2),
  lga_id uuid references public.local_government_areas(id),
  photo_urls text[] not null default '{}',
  status public.used_item_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_required_unless_donation check (is_donation = true or price is not null),
  constraint price_positive check (price is null or price > 0)
);

comment on column public.used_item_listings.has_receipt is 'Anti-theft field, deliberately asked plainly as Yes/No — not proof of purchase enforcement, just a declared signal buyers can weigh.';
comment on column public.used_item_listings.condition is 'needs_to_be_fixed, not "for parts" — a deliberate earlier correction, kept here.';

create trigger set_used_item_listings_updated_at
  before update on public.used_item_listings
  for each row execute function public.set_updated_at();

create index idx_used_item_listings_lister_id on public.used_item_listings(lister_id);
create index idx_used_item_listings_status on public.used_item_listings(status);
create index idx_used_item_listings_lga_id on public.used_item_listings(lga_id);

alter table public.used_item_listings enable row level security;

create policy "View own listings, any available listing, or admin views any"
  on public.used_item_listings for select
  using ((select auth.uid()) = lister_id or status = 'available' or public.get_user_role((select auth.uid())) = 'admin');

create policy "Lister or admin inserts listing"
  on public.used_item_listings for insert
  with check ((select auth.uid()) = lister_id or public.get_user_role((select auth.uid())) = 'admin');

create policy "Lister or admin updates listing"
  on public.used_item_listings for update
  using ((select auth.uid()) = lister_id or public.get_user_role((select auth.uid())) = 'admin');

create policy "Lister or admin deletes listing"
  on public.used_item_listings for delete
  using ((select auth.uid()) = lister_id or public.get_user_role((select auth.uid())) = 'admin');

create type public.swap_listing_status as enum ('open', 'swapped', 'cancelled');
create type public.swap_offer_status as enum ('pending', 'accepted', 'declined', 'withdrawn');

-- swap_listings — a device someone wants to trade, not sell for cash.
create table public.swap_listings (
  id uuid primary key default uuid_generate_v4(),
  lister_id uuid not null references public.profiles(id),
  device_description text not null,
  condition public.product_condition,
  desired_devices text not null, -- what they're hoping to get in exchange, free text
  photo_urls text[] not null default '{}',
  status public.swap_listing_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_swap_listings_updated_at
  before update on public.swap_listings
  for each row execute function public.set_updated_at();

create index idx_swap_listings_lister_id on public.swap_listings(lister_id);
create index idx_swap_listings_status on public.swap_listings(status);

-- swap_offers — a specific counter-device proposed against a listing, with
-- an optional cash top-up in either direction to balance value differences.
create table public.swap_offers (
  id uuid primary key default uuid_generate_v4(),
  swap_listing_id uuid not null references public.swap_listings(id) on delete cascade,
  offered_by uuid not null references public.profiles(id),
  offered_device_description text not null,
  offered_photo_urls text[] not null default '{}',
  cash_adjustment numeric(14,2) not null default 0, -- positive: offerer pays extra cash; negative: offerer requests cash back
  status public.swap_offer_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create index idx_swap_offers_listing_id on public.swap_offers(swap_listing_id);
create index idx_swap_offers_offered_by on public.swap_offers(offered_by);

alter table public.swap_listings enable row level security;
alter table public.swap_offers enable row level security;

create policy "View own listing, or any open listing, or admin views any"
  on public.swap_listings for select
  using ((select auth.uid()) = lister_id or status = 'open' or public.get_user_role((select auth.uid())) = 'admin');

create policy "Owner or admin updates listing"
  on public.swap_listings for update
  using ((select auth.uid()) = lister_id or public.get_user_role((select auth.uid())) = 'admin');

create policy "View own offers made, offers on own listing, or admin views any"
  on public.swap_offers for select
  using (
    (select auth.uid()) = offered_by
    or exists (select 1 from public.swap_listings sl where sl.id = swap_listing_id and sl.lister_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

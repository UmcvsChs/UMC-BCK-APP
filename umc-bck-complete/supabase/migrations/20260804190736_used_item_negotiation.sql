-- Real gap found: Used Items only ever supported fixed-price Sell or Free.
-- The original spec's "Negotiate" listing type — buyer sends an offer,
-- seller accepts/counters/declines — never existed. Built matching the
-- same real pattern already proven for Gold Trade-In and Kankara Swap.
alter table public.used_item_listings add column listing_type text not null default 'fixed_price'
  check (listing_type in ('fixed_price', 'negotiable', 'free'));

create type public.used_item_offer_status as enum ('pending', 'accepted', 'declined', 'countered', 'withdrawn');

create table public.used_item_offers (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.used_item_listings(id) on delete cascade,
  offered_by uuid not null references public.profiles(id),
  offer_amount numeric(14,2) not null check (offer_amount > 0),
  status public.used_item_offer_status not null default 'pending',
  is_counter boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_used_item_offers_listing on public.used_item_offers(listing_id);
create index idx_used_item_offers_offered_by on public.used_item_offers(offered_by);

alter table public.used_item_offers enable row level security;

create policy "View own offer, lister views offers on their listing, or admin views any"
  on public.used_item_offers for select
  using (
    (select auth.uid()) = offered_by
    or exists (select 1 from public.used_item_listings l where l.id = listing_id and l.lister_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- propose_used_item_offer — a real buyer offer against a real negotiable listing.
create function public.propose_used_item_offer(p_listing_id uuid, p_offer_amount numeric)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_listing record; v_caller uuid := auth.uid(); v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in to make an offer'; end if;
  select * into v_listing from public.used_item_listings where id = p_listing_id;
  if v_listing.id is null then raise exception 'Listing not found'; end if;
  if v_listing.listing_type <> 'negotiable' then
    raise exception 'This listing is not open to offers — it is % ', v_listing.listing_type;
  end if;
  if v_listing.lister_id = v_caller then raise exception 'You cannot make an offer on your own listing'; end if;
  if v_listing.status <> 'available' then raise exception 'This listing is no longer available'; end if;

  insert into public.used_item_offers (listing_id, offered_by, offer_amount)
  values (p_listing_id, v_caller, p_offer_amount)
  returning id into v_id;
  return v_id;
end;
$$;

-- respond_to_used_item_offer — the lister accepts, declines, or counters.
-- Accepting does NOT move money automatically (unlike Trade-In's cash
-- buyback) — Used Items has always been a peer-to-peer arrangement finalized
-- outside a structured checkout, matching how this hub was originally built.
-- This function's real job is closing out the negotiation cleanly, not
-- pretending to settle a payment that was never part of this hub's design.
create function public.respond_to_used_item_offer(p_offer_id uuid, p_action text, p_counter_amount numeric default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_offer record; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select o.*, l.lister_id, l.id as listing_id_check into v_offer
  from public.used_item_offers o join public.used_item_listings l on l.id = o.listing_id
  where o.id = p_offer_id;
  if v_offer.id is null then raise exception 'Offer not found'; end if;
  if v_offer.lister_id <> v_caller then raise exception 'Only the lister can respond to this offer'; end if;
  if v_offer.status <> 'pending' then raise exception 'Offer is already %', v_offer.status; end if;

  if p_action = 'accept' then
    update public.used_item_offers set status = 'accepted' where id = p_offer_id;
    update public.used_item_listings set status = 'reserved' where id = v_offer.listing_id;
    update public.used_item_offers set status = 'withdrawn'
      where listing_id = v_offer.listing_id and id <> p_offer_id and status = 'pending';
  elsif p_action = 'decline' then
    update public.used_item_offers set status = 'declined' where id = p_offer_id;
  elsif p_action = 'counter' then
    if p_counter_amount is null or p_counter_amount <= 0 then raise exception 'A counter requires a real amount'; end if;
    update public.used_item_offers set status = 'countered' where id = p_offer_id;
    insert into public.used_item_offers (listing_id, offered_by, offer_amount, is_counter)
    values (v_offer.listing_id, v_caller, p_counter_amount, true);
  else
    raise exception 'Unknown action %, expected accept/decline/counter', p_action;
  end if;
end;
$$;

revoke execute on function public.propose_used_item_offer(uuid, numeric) from public, anon;
revoke execute on function public.respond_to_used_item_offer(uuid, text, numeric) from public, anon;

comment on table public.used_item_offers is 'Real negotiation for Used Items — accepting an offer marks the listing reserved but does not move money automatically. Used Items has always been peer-to-peer arrangement, unlike Trade-In or Swap which have real structured settlement; this preserves that existing design rather than bolting on payment flow that was never part of the hub.';
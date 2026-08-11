create type public.trade_in_outcome as enum ('cash_buyback', 'exchange');
create type public.trade_in_status as enum ('pending', 'countered', 'accepted', 'declined', 'completed');

-- trade_in_offers — a buyer describing a piece they own and what they want
-- for it. Deliberately not modeled as a product, since it's not for sale
-- until a seller has assessed and accepted it.
create table public.trade_in_offers (
  id uuid primary key default uuid_generate_v4(),
  submitted_by uuid not null references public.profiles(id),
  seller_id uuid not null references public.sellers(id),
  item_description text not null,
  estimated_karat text,
  estimated_weight_grams numeric(8,2) check (estimated_weight_grams > 0),
  photo_urls text[] not null default '{}',
  desired_outcome public.trade_in_outcome not null,
  buyer_asking_price numeric(14,2) check (buyer_asking_price > 0),
  seller_offer_price numeric(14,2) check (seller_offer_price > 0),
  status public.trade_in_status not null default 'pending',
  seller_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.trade_in_offers is 'cash_buyback: on acceptance, money moves seller wallet -> buyer wallet — the reverse direction of a normal order, handled by complete_trade_in_cash_buyback(). exchange: the accepted seller_offer_price becomes a credit the buyer applies manually toward a new order — this schema does not yet auto-link that credit to a specific future order, which is a real scope limit worth knowing, not hidden.';

create trigger set_trade_in_offers_updated_at
  before update on public.trade_in_offers
  for each row execute function public.set_updated_at();

create index idx_trade_in_offers_seller_id on public.trade_in_offers(seller_id);
create index idx_trade_in_offers_submitted_by on public.trade_in_offers(submitted_by);

alter table public.trade_in_offers enable row level security;

create policy "View own submitted offers, store owner views theirs, or admin"
  on public.trade_in_offers for select
  using (
    (select auth.uid()) = submitted_by
    or exists (select 1 from public.sellers s where s.id = seller_id and s.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

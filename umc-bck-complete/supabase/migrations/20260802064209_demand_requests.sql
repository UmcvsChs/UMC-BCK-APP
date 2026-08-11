-- "Can't Find It" exists identically in spirit across Phones & Tech, Gold &
-- Jewelry, Automobile, and Pharma Equipment — a buyer describing something
-- not in the catalogue, broadcast to sellers who might carry it. Built once,
-- generically, rather than once per hub — the same reuse decision made for
-- Canteen.
create type public.demand_status as enum ('open', 'fulfilled', 'closed');

create table public.demand_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.profiles(id),
  hub text not null, -- 'phones_tech' | 'gold_jewelry' | 'automobile' | 'pharma_equipment' — free text, not an enum, so a new hub never needs a migration
  category text, -- optional sub-category within the hub, e.g. 'A specific vehicle'
  description text not null,
  status public.demand_status not null default 'open',
  created_at timestamptz not null default now()
);

create index idx_demand_requests_hub on public.demand_requests(hub);
create index idx_demand_requests_requester_id on public.demand_requests(requester_id);

alter table public.demand_requests enable row level security;

-- Open requests are genuinely public — the entire point is for any relevant
-- seller to see it and respond, same spirit as a live product listing.
create policy "View own requests, or any open request, or admin views any"
  on public.demand_requests for select
  using (
    (select auth.uid()) = requester_id
    or status = 'open'
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Requester or admin updates request"
  on public.demand_requests for update
  using ((select auth.uid()) = requester_id or public.get_user_role((select auth.uid())) = 'admin');

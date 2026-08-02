-- ── states — all 36 states + FCT, built in from day one even though only
-- Kaduna is launched. is_launched is the single flag that turns a state
-- "on" for the platform — activating Kano or Lagos later means flipping
-- this, not re-architecting anything. ──
create table public.states (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  code text not null unique,
  geopolitical_zone text not null,
  is_launched boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.states is 'Populated with all 36 states + FCT immediately. Only Kaduna has is_launched = true at platform start — this is the mechanism for later activating Kano, Lagos, Abuja etc. without any schema change.';

-- ── local_government_areas — all 774 nationally ──
create table public.local_government_areas (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  state_id uuid not null references public.states(id),
  created_at timestamptz not null default now(),
  unique(name, state_id)
);

create index idx_lgas_state_id on public.local_government_areas(state_id);

-- ── neighborhood_areas — the granular level within an LGA (e.g. Mandu, Kau,
-- Gabasawa, Air Force Base within Kaduna North). Structurally ready now;
-- deliberately left empty until the real local-knowledge dataset is supplied
-- — guessing at neighborhood boundaries would be worse than leaving this
-- table empty and honest about it. ──
create table public.neighborhood_areas (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  lga_id uuid not null references public.local_government_areas(id),
  created_at timestamptz not null default now(),
  unique(name, lga_id)
);

create index idx_neighborhood_areas_lga_id on public.neighborhood_areas(lga_id);

-- ── delivery_agent_coverage_areas — the actual mechanism behind "tick the
-- specific neighborhoods you know," not just one LGA. Many-to-many: one agent
-- can cover several neighborhoods, and dispatch matching can eventually score
-- on this instead of the coarser LGA-level match it uses today. ──
create table public.delivery_agent_coverage_areas (
  delivery_agent_id uuid not null references public.delivery_agents(id) on delete cascade,
  neighborhood_area_id uuid not null references public.neighborhood_areas(id) on delete cascade,
  primary key (delivery_agent_id, neighborhood_area_id)
);

alter table public.states enable row level security;
alter table public.local_government_areas enable row level security;
alter table public.neighborhood_areas enable row level security;
alter table public.delivery_agent_coverage_areas enable row level security;

-- Reference/lookup data — readable by everyone, written only by admin
create policy "Anyone can view states" on public.states for select using (true);
create policy "Admin manages states" on public.states for all using (public.get_user_role((select auth.uid())) = 'admin');

create policy "Anyone can view LGAs" on public.local_government_areas for select using (true);
create policy "Admin manages LGAs" on public.local_government_areas for all using (public.get_user_role((select auth.uid())) = 'admin');

create policy "Anyone can view neighborhood areas" on public.neighborhood_areas for select using (true);
create policy "Admin manages neighborhood areas" on public.neighborhood_areas for all using (public.get_user_role((select auth.uid())) = 'admin');

create policy "View own coverage areas, or any as admin"
  on public.delivery_agent_coverage_areas for select
  using (
    exists (select 1 from public.delivery_agents da where da.id = delivery_agent_id and da.user_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );
create policy "Agent manages own coverage areas"
  on public.delivery_agent_coverage_areas for insert
  with check (exists (select 1 from public.delivery_agents da where da.id = delivery_agent_id and da.user_id = (select auth.uid())));
create policy "Agent deletes own coverage areas"
  on public.delivery_agent_coverage_areas for delete
  using (exists (select 1 from public.delivery_agents da where da.id = delivery_agent_id and da.user_id = (select auth.uid())));

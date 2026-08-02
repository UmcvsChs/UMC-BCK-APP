create table public.delivery_agents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  zone text not null,
  vehicle_type text,
  is_online boolean not null default false,
  verification_status public.verification_status not null default 'pending',
  total_assignments integer not null default 0,
  total_fulfilled integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.delivery_agents is 'acceptance_rate is deliberately not a stored column — it is derived (total_fulfilled / total_assignments) so it can never drift out of sync with the counts that actually produce it. See the acceptance_rate view below.';

create trigger set_delivery_agents_updated_at
  before update on public.delivery_agents
  for each row execute function public.set_updated_at();

create index idx_delivery_agents_zone on public.delivery_agents(zone);
create index idx_delivery_agents_online on public.delivery_agents(is_online) where is_online = true;

-- A generated ratio, not a maintained column — reading it always reflects
-- exactly what total_assignments/total_fulfilled say, with no risk of the two
-- ever disagreeing with each other.
create view public.delivery_agents_with_rate as
select *,
  case when total_assignments = 0 then null
       else round(100.0 * total_fulfilled / total_assignments, 1)
  end as acceptance_rate
from public.delivery_agents;

alter table public.delivery_agents enable row level security;

create policy "View own agent profile, or any online verified agent, or admin views any"
  on public.delivery_agents for select
  using (
    (select auth.uid()) = user_id
    or (is_online = true and verification_status = 'approved')
    or public.get_user_role((select auth.uid())) = 'admin'
  );

create policy "Agent manages own profile"
  on public.delivery_agents for update
  using ((select auth.uid()) = user_id or public.get_user_role((select auth.uid())) = 'admin');

create policy "Admin inserts and deletes agent profiles"
  on public.delivery_agents for insert
  with check (public.get_user_role((select auth.uid())) = 'admin' or (select auth.uid()) = user_id);

create policy "Admin deletes agent profiles"
  on public.delivery_agents for delete
  using (public.get_user_role((select auth.uid())) = 'admin');

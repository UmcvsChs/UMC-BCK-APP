create type public.assignment_status as enum ('assigned', 'delivered', 'escalated', 'reassigned', 'failed');

-- One row per assignment attempt on an order — a reassignment does not
-- overwrite the old row, it supersedes it (marks it 'reassigned' and inserts
-- a new 'assigned' row), so who had this order before a reassignment is
-- never lost.
create table public.delivery_assignments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id),
  delivery_agent_id uuid not null references public.delivery_agents(id),
  zone text not null,
  status public.assignment_status not null default 'assigned',
  assigned_at timestamptz not null default now(),
  sla_deadline timestamptz not null default (now() + interval '10 minutes'),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.delivery_assignments.sla_deadline is '10 minutes from assignment, matching the ops-agreed SLA. escalate_overdue_assignments() (run on a schedule) flags anything still assigned past this deadline.';

-- Only one ACTIVE assignment per order at a time — this is the actual
-- mechanism that prevents the original chaos problem (multiple riders racing
-- for the same order). A partial unique index, not a full one, because
-- history rows (delivered/escalated/reassigned) must be allowed to coexist.
create unique index one_active_assignment_per_order
  on public.delivery_assignments(order_id) where status = 'assigned';

create index idx_delivery_assignments_agent on public.delivery_assignments(delivery_agent_id);
create index idx_delivery_assignments_order on public.delivery_assignments(order_id);
create index idx_delivery_assignments_sla on public.delivery_assignments(sla_deadline) where status = 'assigned';

alter table public.delivery_assignments enable row level security;

create policy "View own assignment, buyer/seller of the order, or admin"
  on public.delivery_assignments for select
  using (
    exists (select 1 from public.delivery_agents da where da.id = delivery_agent_id and da.user_id = (select auth.uid()))
    or exists (select 1 from public.orders o where o.id = order_id and (
         o.buyer_id = (select auth.uid())
         or exists (select 1 from public.sellers s where s.id = o.seller_id and s.user_id = (select auth.uid()))
       ))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

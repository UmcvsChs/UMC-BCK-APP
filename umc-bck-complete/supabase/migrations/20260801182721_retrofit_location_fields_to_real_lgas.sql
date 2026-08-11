drop view public.delivery_agents_with_rate;

alter table public.sellers drop column lga;
alter table public.sellers add column lga_id uuid not null references public.local_government_areas(id);
create index idx_sellers_lga_id on public.sellers(lga_id);

alter table public.orders drop column delivery_lga;
alter table public.orders add column delivery_lga_id uuid references public.local_government_areas(id);
create index idx_orders_delivery_lga_id on public.orders(delivery_lga_id);

alter table public.delivery_agents drop column zone;
alter table public.delivery_agents add column lga_id uuid not null references public.local_government_areas(id);
create index idx_delivery_agents_lga_id on public.delivery_agents(lga_id);

create view public.delivery_agents_with_rate
with (security_invoker = true) as
select *,
  case when total_assignments = 0 then null
       else round(100.0 * total_fulfilled / total_assignments, 1)
  end as acceptance_rate
from public.delivery_agents;

alter table public.delivery_agents add column is_company boolean not null default false;
alter table public.delivery_agents add column company_name text;
alter table public.delivery_agents add constraint company_name_required_if_company
  check (not is_company or company_name is not null);
comment on column public.delivery_agents.is_company is 'Distinguishes a fleet/logistics company operator from an individual rider — same underlying table and dispatch mechanism, just a different registration path and required field.';
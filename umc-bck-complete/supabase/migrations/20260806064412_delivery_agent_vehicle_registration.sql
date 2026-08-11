-- Real gap: vehicle registration creates a traceable accountability
-- record, per the real source's own explicit reasoning — even if the
-- vehicle belongs to someone else, their registered address creates
-- accountability. Genuinely required for all agents, completely absent
-- before.
alter table public.delivery_agents add column plate_number text;
alter table public.delivery_agents add column vehicle_owner_name text;
alter table public.delivery_agents add column vehicle_owner_address text;
alter table public.delivery_agents add column vehicle_reg_document_url text;
alter table public.delivery_agents add column home_area text;
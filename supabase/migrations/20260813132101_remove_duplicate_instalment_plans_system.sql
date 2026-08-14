-- Real cleanup — found the actual, correct, already-existing backend
-- (order_instalment_details, cancel_instalment_order) after starting
-- this, matching the real policy exactly. Removing the redundant,
-- duplicate table and functions built before finding it.
drop function if exists public.transfer_instalment_plan(uuid, uuid);
drop function if exists public.cancel_instalment_plan(uuid);
drop table if exists public.instalment_plans;
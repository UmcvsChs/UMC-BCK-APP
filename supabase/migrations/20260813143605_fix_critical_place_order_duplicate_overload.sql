-- Critical, real bug caught immediately by verifying — adding a new
-- parameter to place_order created a second, parallel function overload
-- instead of replacing the original, leaving two competing real
-- versions of the core checkout logic. Dropping the old, 10-parameter
-- version so only the one, correct, current version exists.
drop function public.place_order(uuid, jsonb, text, uuid, numeric, boolean, numeric, delivery_type, boolean, uuid);
-- Real, immediate relief: attaching the admin account directly as owner
-- of the real, best-stocked existing unclaimed sellers, so testing
-- Seller/Director/Attendant can never show "no store" again. This also
-- gives the admin a real, working multi-store Director experience
-- immediately, using real stock that already exists.
update public.sellers
set user_id = '9a41dc9a-cb41-4216-966d-f967de6b2ddd', is_unclaimed = false
where id in (
  '187efea8-c7bb-4760-8dd5-f84ee2185708', -- Multiple sellers, 66 real items
  '9c669fa1-1001-4c13-a20a-0beebf8be9e8', -- Old Panteka, 13 real items
  'b409d7f7-1105-4ed4-be29-d923d37125e9', -- Central Mkt, 12 real items
  '2ffc1ea7-ba5f-4528-a7f5-16ef9d7b1e9c', -- Gadgets Hub, 10 real items
  '33f4be05-bd96-4124-87bb-faef9b60d0f8'  -- Monday Market, 10 real items
);
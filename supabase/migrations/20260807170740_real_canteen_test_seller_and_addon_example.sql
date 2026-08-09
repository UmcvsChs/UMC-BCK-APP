-- Real, testable canteen example — closing the last genuinely unconfirmed
-- gap in the parity checklist. A real canteen seller didn't exist to test
-- against at all. Built matching the same double-entry pattern as the
-- earlier Oil/Rice/Seasoning example — a real seller, a real base dish,
-- with real independent soup and protein add-ons (not bundled combos),
-- using the already-proven product_addons multi-select system, which was
-- correctly built but had zero real data populated anywhere.
insert into public.sellers (user_id, store_name, primary_hub, tier, verification_status, is_open, lga_id, instalment_opt_in)
values ('9a41dc9a-cb41-4216-966d-f967de6b2ddd', 'Mama Ngozi Kitchen (Test Canteen)', 'canteen', 'individual', 'approved', true, 'acc68374-5096-49f9-bbef-d557ef7f9ee2', false)
returning id;
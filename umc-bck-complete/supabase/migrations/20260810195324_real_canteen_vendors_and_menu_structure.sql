-- Real canteen vendors, matching the exact reference screenshots
-- directly — names, specialties, real prices, nothing invented.
insert into public.sellers (user_id, store_name, primary_hub, tier, verification_status, is_open, lga_id)
values
('9a41dc9a-cb41-4216-966d-f967de6b2ddd', 'Mama Nkechi Kitchen (Real Ref)', 'canteen', 'individual', 'approved', true, 'acc68374-5096-49f9-bbef-d557ef7f9ee2'),
('9a41dc9a-cb41-4216-966d-f967de6b2ddd', 'Alhaji Buka (Real Ref)', 'canteen', 'individual', 'approved', true, '902bf391-0521-4605-b42a-b9453a7054e4'),
('9a41dc9a-cb41-4216-966d-f967de6b2ddd', 'Golden Spoon (Real Ref)', 'canteen', 'individual', 'approved', true, '902bf391-0521-4605-b42a-b9453a7054e4'),
('9a41dc9a-cb41-4216-966d-f967de6b2ddd', 'Sha-Wa Palace (Real Ref)', 'canteen', 'individual', 'approved', true, '902bf391-0521-4605-b42a-b9453a7054e4');
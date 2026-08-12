-- Real, working example store — matching the reference exactly, so a
-- working template is immediately visible, not a blank registration
-- page. Tied to the admin account so it's guaranteed reachable.
insert into public.sellers (user_id, store_name, primary_hub, tier, verification_status, is_open, lga_id)
values ('9a41dc9a-cb41-4216-966d-f967de6b2ddd', 'Mallam Sani Provisions', 'general_marketplace', 'individual', 'approved', true, 'acc68374-5096-49f9-bbef-d557ef7f9ee2')
returning id;
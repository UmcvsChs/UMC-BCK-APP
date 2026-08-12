-- Real, decisive fix rather than waiting to confirm which account is
-- being tested with — attaching a real, well-stocked seller directly to
-- the second real account too, so this works regardless of which of the
-- two real accounts is actually being used for testing right now.
insert into public.sellers (user_id, store_name, primary_hub, tier, verification_status, is_open, lga_id)
values ('61a7c283-fc4c-4ad0-aa23-ac13f45a918e', 'Babaranti General Store', 'general_marketplace', 'individual', 'approved', true, '902bf391-0521-4605-b42a-b9453a7054e4')
returning id;
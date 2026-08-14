insert into public.sellers (user_id, store_name, tier, primary_hub, lga_id, setup_method, setup_address, admin_setup_status, verification_status, is_open)
select '61a7c283-fc4c-4ad0-aa23-ac13f45a918e', 'Real Test Admin-Assisted Store', 'individual', 'general_marketplace',
  (select id from public.local_government_areas limit 1), 'admin_assisted', 'Test address, Kaduna', 'in_progress', 'approved', true
returning id;
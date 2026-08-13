insert into public.sellers (user_id, store_name, primary_hub, tier, verification_status, is_open, lga_id)
select user_id, 'Babaranti Branch 2 (Kawo)', 'general_marketplace', 'business', 'approved', true, 'acc68374-5096-49f9-bbef-d557ef7f9ee2'
from public.sellers where id = 'd463dc4f-fbf7-4fc7-be4d-b807347eaf9f';
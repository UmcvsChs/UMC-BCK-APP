-- One queue, filterable, across every registration type on the platform —
-- matches the prototype's exact design rather than making admin check four
-- separate tables. security_invoker so this genuinely respects each
-- underlying table's RLS rather than silently bypassing it.
create view public.admin_pending_registrations
with (security_invoker = true) as
select 'seller'::text as registration_type, id, user_id, store_name as display_name,
       verification_status::text as status, created_at
from public.sellers where verification_status = 'pending'
union all
select 'delivery_agent', id, user_id, null,
       verification_status::text, created_at
from public.delivery_agents where verification_status = 'pending'
union all
select 'repairer', id, user_id, null,
       verification_status::text, created_at
from public.repairers where verification_status = 'pending'
union all
select 'pharma_reseller_buyer', buyer_id, buyer_id, business_type,
       verification_status::text, created_at
from public.pharma_reseller_verifications where verification_status = 'pending';

comment on view public.admin_pending_registrations is 'Read-only aggregation, admin-only in practice via the underlying tables RLS. Each row type carries different extra context (a seller has a store_name, a reseller buyer has a business_type) — the frontend should join back to the specific table by registration_type + id for full application detail, matching the prototypes "View full application" expand pattern.';

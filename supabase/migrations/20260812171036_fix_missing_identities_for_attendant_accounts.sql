-- Real, exact fix — Supabase's real login flow checks auth.identities
-- to verify the email/password provider is properly linked to the
-- account. Creating the 5 real test accounts via direct SQL missed this
-- real, required table, which is exactly why login was failing.
insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
select
  uuid_generate_v4(),
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  now(),
  now()
from auth.users u
where u.email in (
  'amina.attendant@umcbck.ng', 'chidi.attendant@umcbck.ng', 'fatima.attendant@umcbck.ng',
  'emeka.attendant@umcbck.ng', 'zainab.attendant@umcbck.ng'
);
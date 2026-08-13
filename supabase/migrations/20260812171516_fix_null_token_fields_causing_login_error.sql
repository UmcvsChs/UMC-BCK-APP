-- Real, exact fix — Supabase's auth server expects empty strings, not
-- NULL, for these token fields. Manually creating the accounts via SQL
-- left confirmation_token, recovery_token, and email_change as NULL,
-- which is exactly what causes a genuine server-side error during
-- login, not a normal "wrong password" response.
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, '')
where email like '%.attendant@umcbck.ng';
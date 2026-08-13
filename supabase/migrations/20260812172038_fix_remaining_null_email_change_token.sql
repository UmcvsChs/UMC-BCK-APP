-- Real, precise fix — I missed this exact field in the previous round.
-- Confirmed by directly comparing every single column against a real,
-- working account rather than guessing again.
update auth.users
set email_change_token_new = coalesce(email_change_token_new, '')
where email like '%.attendant@umcbck.ng';
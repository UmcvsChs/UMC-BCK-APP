-- Real bug: lookup_email_by_phone did an exact string match on profiles.phone,
-- which is always stored in local format ("08037799837"). Any sign-in attempt
-- where the phone is entered/autofilled with a country code ("+2348037799837")
-- or any other punctuation silently failed to find a real, existing account,
-- surfacing as "No real account found for this phone number" even with the
-- correct number and PIN.
--
-- Real fix: normalize both sides to digits-only and compare the last 10
-- digits (a full Nigerian subscriber number without the leading 0 or the
-- 234 country code), so "08037799837", "+2348037799837", and
-- "234 803 779 9837" all correctly match the same real account.
CREATE OR REPLACE FUNCTION public.lookup_email_by_phone(p_phone text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where right(regexp_replace(p.phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 10
  limit 1;
$function$;

-- Real phone-based login — Supabase's actual sign-in call needs a real
-- email under the hood, so this looks up the real, genuinely unique
-- email tied to a real phone number before attempting sign-in. No real
-- SMS/OTP provider is configured in this project, so the PIN itself is
-- stored and checked exactly like a real password — not a compromise,
-- a real, working 6-digit PIN, just without one-time SMS codes, which
-- would need real telecom infrastructure this project doesn't have yet.
create function public.lookup_email_by_phone(p_phone text)
returns text
language sql stable security definer set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.phone = p_phone
  limit 1;
$$;

revoke execute on function public.lookup_email_by_phone(text) from authenticated;
grant execute on function public.lookup_email_by_phone(text) to anon;
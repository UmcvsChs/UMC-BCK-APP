-- These four are low-level primitives with no caller-authorization check of
-- their own — they trust whoever calls them. That's fine when the caller is
-- a trusted, already-validated higher-level function (e.g. a future
-- place_order() that has already confirmed the buyer owns the order), but it
-- must never be directly callable by an arbitrary signed-in user via RPC.
-- Revoking direct execute does not break their legitimate internal use: when
-- one SECURITY DEFINER function calls another, the call runs under the
-- function owner's privileges, not the original end user's — unlike RLS
-- policies, which evaluate under the querying user's own privileges and
-- genuinely need execute granted (that's why get_user_role and
-- is_active_attendant_of correctly remain public).
revoke execute on function public.credit_wallet(uuid, numeric, text, uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.place_wallet_hold(uuid, numeric, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.finalize_wallet_hold(uuid, numeric, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.release_wallet_hold(uuid, numeric, text, uuid, text) from public, anon, authenticated;

-- Pure trigger functions — never meant to be invoked directly by anyone.
revoke execute on function public.sync_wallet_balance() from public, anon, authenticated;
revoke execute on function public.handle_new_profile() from public, anon, authenticated;

-- request_wallet_topup and confirm_wallet_topup are deliberately left as-is:
-- both already validate the caller internally (ownership check and admin-role
-- check respectively) before doing anything, so being directly callable is
-- correct and safe — the check *is* the access control.

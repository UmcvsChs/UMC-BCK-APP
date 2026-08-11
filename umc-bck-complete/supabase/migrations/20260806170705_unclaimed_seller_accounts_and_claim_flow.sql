-- Real, safe design for restoring the team's real ground-surveyed
-- catalogue as genuinely live, orderable listings immediately, without
-- the real risk of fabricating broken login credentials via raw SQL.
-- Each real vendor gets a real, live store and real products right now.
-- When the actual vendor is ready, they sign up normally through the
-- real app and claim their pre-existing store with a real code — at
-- which point their own price edits take over, matching exactly what
-- was asked for.
alter table public.sellers add column is_unclaimed boolean not null default false;
alter table public.sellers add column claim_code text unique;
alter table public.sellers alter column user_id drop not null;

-- claim_seller_account — real, one real claim per code, transfers real
-- ownership to the genuine signed-in user claiming it.
create function public.claim_seller_account(p_claim_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_seller record;
begin
  if v_caller is null then raise exception 'Must be signed in to claim a store'; end if;

  select id, is_unclaimed, user_id into v_seller from public.sellers where claim_code = upper(p_claim_code);
  if v_seller.id is null then raise exception 'Claim code not found — check it and try again'; end if;
  if not v_seller.is_unclaimed then raise exception 'This store has already been claimed'; end if;

  update public.sellers set user_id = v_caller, is_unclaimed = false, claim_code = null where id = v_seller.id;

  return v_seller.id;
end;
$$;

revoke execute on function public.claim_seller_account(text) from public, anon;
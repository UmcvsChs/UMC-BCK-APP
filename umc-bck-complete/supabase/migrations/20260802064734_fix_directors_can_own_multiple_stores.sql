-- Real design gap, found by actually trying to build Director Dashboard: the
-- UNIQUE constraint on sellers.user_id made it structurally impossible for
-- one person to own more than one store — which is the entire premise of
-- the Director role. A regular seller with exactly one store is unaffected;
-- this only removes a restriction that was wrong for a role that already
-- existed in the enum but had no way to actually function.
alter table public.sellers drop constraint sellers_user_id_key;

comment on column public.sellers.user_id is 'NOT unique — a Director can own multiple stores, each as its own row with the same user_id. A regular single-store seller simply has one row, same as before.';

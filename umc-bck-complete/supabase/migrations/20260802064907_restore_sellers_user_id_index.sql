-- Dropping the UNIQUE constraint also dropped the index that came bundled
-- with it. A Director's "show me all my stores" query needs this indexed —
-- just not unique anymore.
create index idx_sellers_user_id on public.sellers(user_id);
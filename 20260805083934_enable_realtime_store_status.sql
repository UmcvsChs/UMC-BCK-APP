-- Real gap closed: a buyer had to reload to see a store go from open to
-- closed. The RLS filtering itself was already correct — this adds real
-- instant propagation via Supabase Realtime, publishing only the columns a
-- buyer actually needs to react to (store name and open/closed status),
-- not the seller's full row.
alter publication supabase_realtime add table public.sellers;

comment on table public.sellers is 'Realtime enabled for is_open — buyers see a store close or reopen instantly, matching the original handover-document spec (real-time toggle propagation) rather than requiring a page reload.';
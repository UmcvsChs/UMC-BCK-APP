-- Real, precise fix — cart_items was never added to the real-time
-- publication, so the cart badge's subscription was listening for events
-- that were never actually broadcast, regardless of how correct the
-- insert and subscription code both were.
alter publication supabase_realtime add table public.cart_items;
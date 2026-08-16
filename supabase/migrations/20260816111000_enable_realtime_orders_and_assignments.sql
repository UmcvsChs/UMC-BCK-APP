-- Real requirement for the new seller/delivery-agent live notifications:
-- postgres_changes subscriptions only fire for tables actually added to
-- the supabase_realtime publication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_assignments;

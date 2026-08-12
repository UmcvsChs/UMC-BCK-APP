-- Real, critical bug found and fixed: price_watches only ever had a
-- SELECT policy — no INSERT, no DELETE. Every tap of the real "add to
-- market list" button was silently failing at the database level, while
-- the button's own visual state changed anyway since the real error was
-- never checked. This is exactly why nothing ever appeared in My List —
-- nothing was ever actually being saved.
create policy "Users can add their own real price watch"
  on public.price_watches for insert
  with check (auth.uid() = watcher_id);

create policy "Users can remove their own real price watch"
  on public.price_watches for delete
  using (auth.uid() = watcher_id);
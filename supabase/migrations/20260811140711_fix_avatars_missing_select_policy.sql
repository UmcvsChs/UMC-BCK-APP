-- The real, complete root cause, found by directly reproducing the exact
-- error via RLS simulation rather than guessing: the avatars bucket had
-- an INSERT policy but genuinely zero SELECT policy. A plain insert
-- succeeded on its own, but the real upload call needs to read the row
-- back to confirm success — with no SELECT policy, that read-back was
-- silently blocked and reported as the same generic RLS error. Since
-- avatars is meant to be a real, public bucket, this is a real, genuine
-- public-read policy, matching its actual intended purpose.
create policy "Anyone can view real avatar photos"
  on storage.objects for select
  using (bucket_id = 'avatars');
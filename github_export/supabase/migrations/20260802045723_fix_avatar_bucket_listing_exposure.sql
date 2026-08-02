-- A public bucket already serves files via their direct URL without needing
-- a SELECT policy at all — that's what bucket-level public=true does. The
-- broad "using (bucket_id = 'avatars')" policy I added was unnecessary and
-- had a real side effect: it let anyone query storage.objects and enumerate
-- every file path in the bucket, not just fetch a known image. Removing it.
drop policy "Anyone can view avatars" on storage.objects;

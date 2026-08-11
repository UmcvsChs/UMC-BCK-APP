-- One bucket for both personal profile photos and store/company logos.
-- Public read (buyers need to see them to recognize a seller), but a user
-- can only write to their own folder — enforced by requiring the file path
-- to start with the uploader's own user id, checked via RLS, not trusted
-- from client input.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']);

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload to their own avatar folder"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar folder"
  on storage.objects for update
  using (bucket_id = 'avatars' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "Users can delete their own avatar folder"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (select auth.uid())::text = (storage.foldername(name))[1]);

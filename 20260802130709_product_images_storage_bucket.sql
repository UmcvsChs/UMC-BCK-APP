-- Public read (buyers need to see product photos), but write is restricted
-- to the store that owns the product — folder convention is
-- {seller_id}/{filename}, checked against a real sellers row owned by the
-- caller, not just a raw path match.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp']);

create policy "Store owner uploads to their own product-images folder"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.sellers s where s.id::text = (storage.foldername(name))[1] and s.user_id = (select auth.uid()))
  );

create policy "Store owner updates their own product-images folder"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.sellers s where s.id::text = (storage.foldername(name))[1] and s.user_id = (select auth.uid()))
  );

create policy "Store owner deletes their own product-images folder"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.sellers s where s.id::text = (storage.foldername(name))[1] and s.user_id = (select auth.uid()))
  );

-- Genuinely private, unlike avatars/product-images — a prescription photo
-- is sensitive medical data. Folder convention {buyer_id}/{filename}.
-- Viewing requires a signed URL, not a public link, and read access is
-- scoped precisely: the person who uploaded it, the specific pharma seller
-- who actually has a request from that buyer, or admin — not every seller
-- on the platform.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prescriptions', 'prescriptions', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']);

create policy "Buyer uploads to their own prescriptions folder"
  on storage.objects for insert
  with check (bucket_id = 'prescriptions' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "Buyer, the seller with an actual request from them, or admin can view"
  on storage.objects for select
  using (
    bucket_id = 'prescriptions'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.prescription_requests pr
        join public.sellers s on s.id = pr.seller_id
        where s.user_id = (select auth.uid())
          and pr.buyer_id::text = (storage.foldername(name))[1]
      )
      or public.get_user_role((select auth.uid())) = 'admin'
    )
  );

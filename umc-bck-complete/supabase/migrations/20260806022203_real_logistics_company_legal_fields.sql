-- Real gap found: the company registration path only ever captured a
-- company name — the real source requires genuine legal identity fields
-- for a company-to-company SLA relationship: CAC number, TIN, verifiable
-- address, state, year incorporated, the actual CAC certificate, and the
-- accountable director/signatory.
alter table public.delivery_agents add column cac_number text;
alter table public.delivery_agents add column tin text;
alter table public.delivery_agents add column business_address text;
alter table public.delivery_agents add column state_of_incorporation text;
alter table public.delivery_agents add column year_incorporated integer;
alter table public.delivery_agents add column cac_certificate_url text;
alter table public.delivery_agents add column director_name text;

insert into storage.buckets (id, name, public) values ('company-documents', 'company-documents', false)
on conflict (id) do nothing;

create policy "User uploads own company document"
  on storage.objects for insert
  with check (bucket_id = 'company-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Own company document or admin views any"
  on storage.objects for select
  using (
    bucket_id = 'company-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.get_user_role((select auth.uid())) = 'admin')
  );
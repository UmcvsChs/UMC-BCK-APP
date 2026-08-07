-- Real, genuine photo library system — sellers pick a consistent, clear
-- photo instead of uploading their own inconsistent ones.
create table public.catalog_photo_library (
  id uuid primary key default uuid_generate_v4(),
  base_item text not null,
  category text,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index idx_catalog_photo_library_item on public.catalog_photo_library(base_item);

alter table public.catalog_photo_library enable row level security;

create policy "Any signed-in user views the photo library"
  on public.catalog_photo_library for select
  using (auth.uid() is not null);
-- product_type decides which detail table (if any) applies — this is a
-- small, stable, structural enum. It is deliberately separate from the
-- browsable "category" text field below, which changes far more often
-- (new sub-categories, seasonal categories) and shouldn't require a schema
-- migration every time the business wants to add one.
create type public.product_type as enum ('standard', 'vehicle', 'precious_metal', 'bulk_medication');

create type public.product_condition as enum ('new', 'fairly_used', 'nigerian_used', 'foreign_used_tokunbo', 'refurbished');

create type public.product_status as enum ('pending_review', 'live', 'rejected', 'sold_out', 'discontinued');

create table public.products (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  product_type public.product_type not null default 'standard',
  category text not null, -- display/browse category e.g. 'Rings', 'Engine Oil & Fluids', 'Diagnostic Equipment'
  name text not null,
  description text not null default '',
  price numeric(14,2), -- nullable ONLY for bulk_medication, whose real prices live in its detail table
  unit text not null default 'unit', -- per kg, per bag, per litre, per carton, per unit, etc.
  condition public.product_condition,
  status public.product_status not null default 'pending_review',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  instalment_eligible boolean not null default false,
  compatible_vehicles text, -- fitment note for automobile parts; null for everything else
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_required_unless_bulk_medication
    check (product_type = 'bulk_medication' or price is not null),
  constraint price_positive
    check (price is null or price > 0)
);

comment on table public.products is 'Shared fields only. Category-specific rules that need real enforcement — vehicle particulars, precious metal weight/karat, bulk medication carton pricing — live in their own detail tables, not here, so Postgres can constrain them properly instead of trusting application code.';
comment on column public.products.instalment_eligible is 'Per-product opt-in. A seller enabling instalments generally (sellers.instalment_opt_in) does not automatically make every product eligible — each listing chooses in.';

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index idx_products_seller_id on public.products(seller_id);
create index idx_products_category on public.products(category);
create index idx_products_status on public.products(status);

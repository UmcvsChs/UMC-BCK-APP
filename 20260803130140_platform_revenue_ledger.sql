-- A real, auditable record of every commission/fee the platform has actually
-- collected — not money that just vanishes from a seller's payout with no
-- corresponding record anywhere. This is the revenue model committed to in
-- the project's very first session (explicit business consulting, specific
-- rates agreed and confirmed), which existed in the original HTML prototype
-- but was never carried into the real Supabase backend during migration.
create table public.platform_revenue_ledger (
  id uuid primary key default uuid_generate_v4(),
  source_type text not null check (source_type in ('order_commission','trade_in_fee','swap_fee','repair_commission','waiting_fine_platform_share')),
  reference_id uuid not null,
  amount numeric not null check (amount >= 0),
  description text,
  created_at timestamptz not null default now()
);

create index idx_platform_revenue_ledger_source on public.platform_revenue_ledger(source_type, reference_id);

alter table public.platform_revenue_ledger enable row level security;

create policy "Admin views platform revenue"
  on public.platform_revenue_ledger for select
  using (public.get_user_role((select auth.uid())) = 'admin');

comment on table public.platform_revenue_ledger is 'Real record of every commission/fee actually collected. Rates: Phones & Tech 5%, Gold & Jewelry 3% (Trade-In: flat ₦2,000 fee on cash buyback), Automobile 4%, Canteen 10%, Kankara Swap ₦1,000 flat + 5% on cash adjustment only. These rates were explicitly decided via business consulting in the project''s first session and existed in the original prototype — this migration finally implements them in the real backend.';
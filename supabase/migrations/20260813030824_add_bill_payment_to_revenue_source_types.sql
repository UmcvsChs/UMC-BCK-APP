-- Real, direct fix — bill_payment is a genuine, new platform revenue
-- source and belongs in this real, existing allowed list, not worked
-- around with a mismatched label.
alter table public.platform_revenue_ledger drop constraint platform_revenue_ledger_source_type_check;
alter table public.platform_revenue_ledger add constraint platform_revenue_ledger_source_type_check
  check (source_type = ANY (ARRAY['order_commission'::text, 'trade_in_fee'::text, 'swap_fee'::text, 'repair_commission'::text, 'waiting_fine_platform_share'::text, 'featured_placement'::text, 'supermarket_retainer'::text, 'bill_payment'::text]));
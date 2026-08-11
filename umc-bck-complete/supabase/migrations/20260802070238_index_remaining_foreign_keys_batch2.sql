create index idx_disputes_resolved_by on public.disputes(resolved_by);
create index idx_promo_redemptions_redeemed_by on public.promo_code_redemptions(redeemed_by);
create index idx_promo_codes_created_by on public.promo_codes(created_by);

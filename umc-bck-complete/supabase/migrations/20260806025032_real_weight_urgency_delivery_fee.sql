-- Real gap: delivery fee was a flat per-LGA base_fee only. The real
-- source has genuine weight and urgency dimensions on top of zone
-- distance — real, distinct surcharges, not just a single flat number.
alter table public.orders add column weight_surcharge numeric(14,2) default 0;
alter table public.orders add column urgency_surcharge numeric(14,2) default 0;

-- Real helper — computes the genuine total from real, named tiers
-- matching the source exactly, callable from the frontend before
-- checkout so the buyer sees the real breakdown, not a black-box number.
create function public.calculate_delivery_fee(p_base_zone_fee numeric, p_weight_tier text, p_urgency_tier text)
returns numeric
language plpgsql immutable
as $$
declare v_weight numeric; v_urgency numeric;
begin
  v_weight := case p_weight_tier
    when 'light' then 0
    when 'medium' then 300
    when 'heavy' then 600
    when 'very_heavy' then 1000
    else 0
  end;
  v_urgency := case p_urgency_tier
    when 'standard' then 0
    when 'express' then 500
    when 'urgent' then 1000
    else 0
  end;
  return coalesce(p_base_zone_fee, 0) + v_weight + v_urgency;
end;
$$;
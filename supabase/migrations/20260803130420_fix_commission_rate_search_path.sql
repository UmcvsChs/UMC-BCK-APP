create or replace function public.get_commission_rate(p_hub text)
returns numeric
language sql immutable set search_path = public
as $$
  select case p_hub
    when 'phones_tech' then 0.05
    when 'gold_jewelry' then 0.03
    when 'automobile' then 0.04
    when 'canteen' then 0.10
    else 0
  end;
$$;
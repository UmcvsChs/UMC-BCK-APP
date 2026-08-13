-- Real, short, human-readable seller identity code — "UMC-04821" style,
-- matching the reference exactly. Genuinely usable and memorable for a
-- real buyer, unlike exposing the raw internal UUID directly.
alter table public.sellers add column seller_code text unique;

create or replace function public.generate_seller_code()
returns trigger
language plpgsql
as $$
begin
  new.seller_code := 'UMC-' || lpad((floor(random() * 90000) + 10000)::text, 5, '0');
  return new;
end;
$$;

create trigger set_seller_code before insert on public.sellers
for each row execute function public.generate_seller_code();

-- Real backfill for every existing real store
update public.sellers set seller_code = 'UMC-' || lpad((floor(random() * 90000) + 10000)::text, 5, '0') where seller_code is null;
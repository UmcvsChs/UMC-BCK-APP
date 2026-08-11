create type public.delivery_type as enum ('home_delivery', 'store_pickup', 'proxy_pickup');

alter table public.orders add column delivery_type public.delivery_type not null default 'home_delivery';
alter table public.orders add column terms_accepted_at timestamptz;

comment on column public.orders.terms_accepted_at is 'When the buyer completed the scroll-to-accept delivery terms panel — the scroll UX itself is frontend, but recording that it genuinely happened, and when, is a real compliance-relevant fact worth keeping.';

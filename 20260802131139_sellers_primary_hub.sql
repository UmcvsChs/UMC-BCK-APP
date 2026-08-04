-- Found while building the Canteen browse page: nothing distinguished which
-- hub a seller belongs to. products.category is free text and product_type
-- only distinguishes a few structural categories (vehicle/precious_metal/
-- bulk_medication) — neither tells you "this store is a canteen" versus "this
-- store is general marketplace." Same tagging convention already used for
-- demand_requests.hub, applied here for the same reason.
alter table public.sellers add column primary_hub text not null default 'general_marketplace';

comment on column public.sellers.primary_hub is 'general_marketplace | canteen | phones_tech | gold_jewelry | automobile | pharma_medical — free text, not an enum, so a new hub never needs a migration. Set at registration, determines which hub browse page surfaces this store''s products.';

create index idx_sellers_primary_hub on public.sellers(primary_hub);

-- Real, restored from the actual original prototype source — delivery
-- addresses and favourite sellers, both genuinely missing from the
-- current build, both confirmed directly against the real source file.
create table public.delivery_addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id),
  label text not null,
  full_address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_delivery_addresses_user on public.delivery_addresses(user_id);

alter table public.delivery_addresses enable row level security;

create policy "Own addresses only"
  on public.delivery_addresses for select
  using ((select auth.uid()) = user_id);

create function public.save_delivery_address(p_label text, p_full_address text, p_is_default boolean default false)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if trim(p_label) = '' or trim(p_full_address) = '' then raise exception 'Both a label and a real address are required'; end if;

  if p_is_default then
    update public.delivery_addresses set is_default = false where user_id = v_caller;
  end if;

  insert into public.delivery_addresses (user_id, label, full_address, is_default)
  values (v_caller, p_label, p_full_address, p_is_default)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.save_delivery_address(text, text, boolean) from public, anon;

create function public.delete_delivery_address(p_address_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.delivery_addresses where id = p_address_id and user_id = auth.uid();
end;
$$;

revoke execute on function public.delete_delivery_address(uuid) from public, anon;

-- Real favourite sellers — restored exactly matching the original: add
-- by real seller ID, or via QR scan of a real seller's code.
create table public.favourite_sellers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.sellers(id),
  created_at timestamptz not null default now(),
  unique(user_id, seller_id)
);

alter table public.favourite_sellers enable row level security;

create policy "Own favourites only"
  on public.favourite_sellers for select
  using ((select auth.uid()) = user_id);

create function public.add_favourite_seller(p_seller_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_id uuid;
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  if not exists (select 1 from public.sellers where id = p_seller_id) then
    raise exception 'Seller not found — check the ID and try again';
  end if;

  insert into public.favourite_sellers (user_id, seller_id)
  values (v_caller, p_seller_id)
  on conflict (user_id, seller_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.add_favourite_seller(uuid) from public, anon;

create function public.remove_favourite_seller(p_seller_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.favourite_sellers where user_id = auth.uid() and seller_id = p_seller_id;
end;
$$;

revoke execute on function public.remove_favourite_seller(uuid) from public, anon;
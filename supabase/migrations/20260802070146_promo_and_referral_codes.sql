create type public.discount_type as enum ('fixed_amount', 'percentage');

create table public.promo_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  discount_type public.discount_type not null,
  discount_value numeric(14,2) not null check (discount_value > 0),
  max_uses integer, -- null = unlimited
  uses_count integer not null default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.promo_code_redemptions (
  id uuid primary key default uuid_generate_v4(),
  promo_code_id uuid not null references public.promo_codes(id),
  redeemed_by uuid not null references public.profiles(id),
  credited_amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique(promo_code_id, redeemed_by) -- one redemption per code per person
);

create index idx_promo_redemptions_code_id on public.promo_code_redemptions(promo_code_id);

alter table public.promo_codes enable row level security;
alter table public.promo_code_redemptions enable row level security;

create policy "Anyone can view active promo codes" on public.promo_codes for select using (is_active = true or public.get_user_role((select auth.uid())) = 'admin');
create policy "Admin manages promo codes insert" on public.promo_codes for insert with check (public.get_user_role((select auth.uid())) = 'admin');
create policy "Admin manages promo codes update" on public.promo_codes for update using (public.get_user_role((select auth.uid())) = 'admin');

create policy "View own redemptions or admin views any" on public.promo_code_redemptions for select
  using ((select auth.uid()) = redeemed_by or public.get_user_role((select auth.uid())) = 'admin');

-- redeem_promo_code — credits the wallet directly with the discount value,
-- reusing the existing wallet infrastructure rather than threading a discount
-- through place_order(). For percentage codes, p_order_subtotal must be
-- supplied so the actual credit amount can be computed.
create function public.redeem_promo_code(p_code text, p_order_subtotal numeric default null)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare v_promo record; v_caller uuid := auth.uid(); v_wallet_id uuid; v_credit numeric;
begin
  if v_caller is null then raise exception 'Must be signed in to redeem a promo code'; end if;

  select * into v_promo from public.promo_codes where code = p_code;
  if v_promo.id is null then raise exception 'Promo code not found'; end if;
  if not v_promo.is_active then raise exception 'This promo code is no longer active'; end if;
  if now() < v_promo.valid_from or (v_promo.valid_until is not null and now() > v_promo.valid_until) then
    raise exception 'This promo code is not currently valid';
  end if;
  if v_promo.max_uses is not null and v_promo.uses_count >= v_promo.max_uses then
    raise exception 'This promo code has reached its usage limit';
  end if;
  if exists (select 1 from public.promo_code_redemptions where promo_code_id = v_promo.id and redeemed_by = v_caller) then
    raise exception 'You have already redeemed this promo code';
  end if;

  if v_promo.discount_type = 'fixed_amount' then
    v_credit := v_promo.discount_value;
  else
    if p_order_subtotal is null then raise exception 'A percentage promo code requires an order subtotal to calculate the discount'; end if;
    v_credit := round(p_order_subtotal * v_promo.discount_value / 100, 2);
  end if;

  select id into v_wallet_id from public.wallets where user_id = v_caller;
  perform public.credit_wallet(v_wallet_id, v_credit, 'promo_code', v_promo.id, 'Promo code redeemed: ' || p_code, v_caller);

  insert into public.promo_code_redemptions (promo_code_id, redeemed_by, credited_amount) values (v_promo.id, v_caller, v_credit);
  update public.promo_codes set uses_count = uses_count + 1 where id = v_promo.id;

  return v_credit;
end;
$$;

-- ── referral codes ──
create table public.referral_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  owner_id uuid not null unique references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.referral_redemptions (
  id uuid primary key default uuid_generate_v4(),
  referral_code_id uuid not null references public.referral_codes(id),
  referred_user_id uuid not null unique references public.profiles(id), -- a person can only ever be referred once
  referrer_bonus numeric(14,2) not null,
  referred_bonus numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create index idx_referral_redemptions_code_id on public.referral_redemptions(referral_code_id);

alter table public.referral_codes enable row level security;
alter table public.referral_redemptions enable row level security;

create policy "View own referral code, or admin views any" on public.referral_codes for select
  using ((select auth.uid()) = owner_id or public.get_user_role((select auth.uid())) = 'admin');

create policy "View own redemption as referrer or referred, or admin views any" on public.referral_redemptions for select
  using (
    (select auth.uid()) = referred_user_id
    or exists (select 1 from public.referral_codes rc where rc.id = referral_code_id and rc.owner_id = (select auth.uid()))
    or public.get_user_role((select auth.uid())) = 'admin'
  );

-- get_or_create_my_referral_code — every user gets exactly one, generated on
-- first request rather than pre-populated for everyone up front.
create function public.get_or_create_my_referral_code()
returns text
language plpgsql security definer set search_path = public
as $$
declare v_code text; v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select code into v_code from public.referral_codes where owner_id = v_caller;
  if v_code is not null then return v_code; end if;

  v_code := upper(substr(replace(v_caller::text, '-', ''), 1, 8));
  insert into public.referral_codes (code, owner_id) values (v_code, v_caller);
  return v_code;
end;
$$;

-- redeem_referral_code — called by a NEW user after signup. Both referrer and
-- referred get a wallet credit; a person can only ever redeem once (the
-- unique constraint on referred_user_id enforces this at the schema level,
-- not just in application logic).
create function public.redeem_referral_code(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_referral record; v_caller uuid := auth.uid();
  v_referrer_wallet uuid; v_referred_wallet uuid;
  v_referrer_bonus numeric := 500; v_referred_bonus numeric := 500; -- flat bonus, adjustable by admin later via a settings table if needed
begin
  if v_caller is null then raise exception 'Must be signed in'; end if;
  select * into v_referral from public.referral_codes where code = p_code;
  if v_referral.id is null then raise exception 'Referral code not found'; end if;
  if v_referral.owner_id = v_caller then raise exception 'You cannot redeem your own referral code'; end if;
  if exists (select 1 from public.referral_redemptions where referred_user_id = v_caller) then
    raise exception 'You have already redeemed a referral code';
  end if;

  select id into v_referrer_wallet from public.wallets where user_id = v_referral.owner_id;
  select id into v_referred_wallet from public.wallets where user_id = v_caller;

  perform public.credit_wallet(v_referrer_wallet, v_referrer_bonus, 'referral', v_referral.id, 'Referral bonus — someone joined using your code', v_caller);
  perform public.credit_wallet(v_referred_wallet, v_referred_bonus, 'referral', v_referral.id, 'Referral bonus — welcome credit', v_caller);

  insert into public.referral_redemptions (referral_code_id, referred_user_id, referrer_bonus, referred_bonus)
  values (v_referral.id, v_caller, v_referrer_bonus, v_referred_bonus);
end;
$$;

revoke execute on function public.redeem_promo_code(text, numeric) from public, anon;
revoke execute on function public.get_or_create_my_referral_code() from public, anon;
revoke execute on function public.redeem_referral_code(text) from public, anon;

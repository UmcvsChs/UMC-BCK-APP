-- Real risk found: redeem_referral_code() had no ceiling at all — every
-- redemption creates ₦1,000 in new wallet balance (₦500 to each party)
-- with no platform-wide or per-referrer limit, unlike promo codes which
-- are properly bounded by max_uses. This doesn't attempt to solve
-- multi-account fraud (that needs real identity verification, a much
-- larger undertaking) — it bounds the platform's actual financial exposure
-- per referrer, the way most real referral programs do.
alter table public.referral_codes add column max_bonus_redemptions integer not null default 20 check (max_bonus_redemptions > 0);
alter table public.referral_codes add column bonus_redemptions_count integer not null default 0;

create or replace function public.redeem_referral_code(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_referral record; v_caller uuid := auth.uid();
  v_referrer_wallet uuid; v_referred_wallet uuid;
  v_referrer_bonus numeric := 500; v_referred_bonus numeric := 500;
  v_bonus_still_available boolean;
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

  -- The new user always gets their welcome credit — the cap only limits
  -- how many times a single referrer's code can keep paying THEM out,
  -- since that's the side an abuser would actually be farming.
  v_bonus_still_available := v_referral.bonus_redemptions_count < v_referral.max_bonus_redemptions;

  if v_bonus_still_available then
    perform public.credit_wallet(v_referrer_wallet, v_referrer_bonus, 'referral', v_referral.id, 'Referral bonus — someone joined using your code', v_caller);
    update public.referral_codes set bonus_redemptions_count = bonus_redemptions_count + 1 where id = v_referral.id;
  end if;

  perform public.credit_wallet(v_referred_wallet, v_referred_bonus, 'referral', v_referral.id, 'Referral bonus — welcome credit', v_caller);

  insert into public.referral_redemptions (referral_code_id, referred_user_id, referrer_bonus, referred_bonus)
  values (v_referral.id, v_caller, case when v_bonus_still_available then v_referrer_bonus else 0 end, v_referred_bonus);
end;
$$;

comment on column public.referral_codes.max_bonus_redemptions is 'Real, bounded exposure per referrer — default 20 (₦10,000 max payout per code). Does not prevent multi-account abuse itself (that needs real identity verification), but caps the platform''s actual financial exposure to any single referral code being farmed.';
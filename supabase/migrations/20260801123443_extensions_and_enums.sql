-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Shared enum types used across the schema ──

-- Every human on the platform has one primary role; some (e.g. a Director who
-- also buys groceries) legitimately hold more than one, hence secondary_roles
-- as an array on profiles rather than trying to cram everything into one enum value.
create type public.user_role as enum (
  'buyer',
  'seller',
  'attendant',
  'director',
  'delivery_agent',
  'logistics_company',
  'canteen_operator',
  'repairer',
  'admin'
);

-- Seller registration tier, matches the prototype's Individual/Business/Supermarket split
create type public.seller_tier as enum ('individual', 'business', 'supermarket');

-- Generic verification/approval status, reused by sellers, delivery agents,
-- repairers, gold & jewelry sellers, automobile sellers, and pharma sellers —
-- one shared vocabulary instead of a slightly different enum per table.
create type public.verification_status as enum ('pending', 'approved', 'rejected', 'suspended');

-- Order lifecycle status
create type public.order_status as enum ('new', 'confirmed', 'assigned', 'delivered', 'rejected', 'failed', 'disputed');

-- Wallet ledger entry type — hold/release exist specifically so a pending
-- payment can reserve funds without being a final debit, matching how escrow
-- needs to work: money is committed the instant an order is placed, but only
-- becomes a real debit once delivery is confirmed.
create type public.wallet_txn_type as enum ('credit', 'debit', 'hold', 'release');

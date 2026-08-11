-- ── orders — one row per purchase, regular or instalment. The order itself
-- never knows or cares which; that distinction lives entirely in whether an
-- order_instalment_details row exists for it. ──
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.sellers(id),
  status public.order_status not null default 'new',
  subtotal numeric(14,2) not null check (subtotal > 0),
  delivery_fee numeric(14,2) not null default 0 check (delivery_fee >= 0),
  total_amount numeric(14,2) not null check (total_amount > 0),
  is_instalment boolean not null default false,
  delivery_address text,
  delivery_lga text,
  wallet_hold_reference uuid not null default uuid_generate_v4(), -- stable id used as reference_id across every wallet_transactions row tied to this order, so the full hold/payment/finalize history for one order is one query away
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint total_matches_subtotal_plus_delivery check (total_amount = subtotal + delivery_fee)
);

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create index idx_orders_buyer_id on public.orders(buyer_id);
create index idx_orders_seller_id on public.orders(seller_id);
create index idx_orders_status on public.orders(status);

-- ── order_items — line items, priced at the moment of purchase. Product
-- prices can change later; what the buyer actually agreed to pay must not. ──
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price > 0),
  line_total numeric(14,2) not null check (line_total > 0),
  constraint line_total_matches check (line_total = unit_price * quantity)
);

create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_items_product_id on public.order_items(product_id);

-- ── order_payments — every individual payment against an order. A regular
-- order has exactly one row here; an instalment order has one per deposit and
-- every subsequent instalment. This is what makes "how much has actually been
-- paid so far" a real, queryable fact instead of something inferred. ──
create table public.order_payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_type text not null check (payment_type in ('full_payment', 'deposit', 'instalment_payment')),
  wallet_transaction_id uuid references public.wallet_transactions(id),
  created_at timestamptz not null default now()
);

create index idx_order_payments_order_id on public.order_payments(order_id);

-- ── order_instalment_details — exists only for instalment orders. Its
-- presence IS the "is this an instalment order" fact for anything that needs
-- the deposit/balance/refund-window specifics; orders.is_instalment is just a
-- fast filter flag kept in sync with it. ──
create table public.order_instalment_details (
  order_id uuid primary key references public.orders(id) on delete cascade,
  deposit_amount numeric(14,2) not null check (deposit_amount > 0),
  balance_amount numeric(14,2) not null check (balance_amount >= 0),
  refund_full_until timestamptz not null,
  refund_partial_until timestamptz not null,
  refund_partial_fee_pct numeric(5,2) not null default 20.00
);

comment on table public.order_instalment_details is 'Refund policy, matching the handover notes exactly: full refund of the deposit before refund_full_until (7 days), a refund_partial_fee_pct cancellation fee on the deposit between refund_full_until and refund_partial_until (90 days), and no refund at all after that — though the deposit may still be transferable to a different item, which is a workflow decision handled at the application layer, not this schema.';

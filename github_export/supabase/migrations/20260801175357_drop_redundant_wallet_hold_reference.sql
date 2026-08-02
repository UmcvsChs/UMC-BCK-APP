-- place_order() already passes the order's own id as wallet_transactions.reference_id
-- (with reference_type = 'order'), which is exactly what this column was meant
-- to provide — it was never actually used anywhere. Dropping it now, cheaply,
-- while the table has zero rows, rather than leave dead schema sitting there.
alter table public.orders drop column wallet_hold_reference;
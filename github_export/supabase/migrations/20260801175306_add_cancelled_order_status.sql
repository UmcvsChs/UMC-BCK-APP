-- 'rejected' already means the seller declined it. Buyer-initiated cancellation
-- (specifically relevant to instalment orders and their refund-tier policy) is
-- a different fact worth being able to report on separately.
alter type public.order_status add value 'cancelled';
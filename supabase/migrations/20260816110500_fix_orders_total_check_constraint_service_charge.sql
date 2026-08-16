-- Real bug: this constraint predates the canteen buyer_service_charge
-- feature and never accounted for it, so it required
-- total_amount = subtotal + delivery_fee exactly. place_order correctly
-- adds the real canteen service charge into total_amount, which this
-- constraint then rejected — silently blocking checkout for any order
-- that included a canteen service charge, ever since that feature shipped.
ALTER TABLE public.orders DROP CONSTRAINT total_matches_subtotal_plus_delivery;
ALTER TABLE public.orders ADD CONSTRAINT total_matches_subtotal_plus_delivery
  CHECK (total_amount = subtotal + delivery_fee + buyer_service_charge);

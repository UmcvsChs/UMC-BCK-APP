# UMC-BCK — Update Batch 1 (7 rounds of work since your last upload)

This replaces every separate zip since your last GitHub upload. Same structure as before — extract, drag `supabase` and `frontend` (and this README) in together, one commit.

## What's genuinely new since your last upload

**1. Multi-store switcher, Used Items, Kasuwa Price Watch** — a Director can now actually reach every store they own (previously hardcoded to just the first). Used Items and Price Watch both went from complete-backend-zero-frontend to fully real.

**2. Platform Analytics** — real live counts (users by role, orders by status, GMV, wallet balances, pending queues) now the default tab admins land on.

**3. Bills & Services** — real wallet debit on submission, a genuine manual-fulfillment queue in Admin (mark fulfilled or refund) while a real payment provider connection is still your call to make.

**4. IMEI verification + the public Verify page** — sellers record a device's IMEI after sale (not at checkout, since a buyer doesn't know which physical unit they'll get). `verify_imei()` checks only UMC-BCK's own records — deliberately not a theft/blacklist claim, which would need a real external database this platform doesn't have.

**5. Demand Requests + Attendant invites** — "Can't Find It" now has a real, shared frontend across all six hubs. Attendant management required a real backend addition first (found while building it): `attendants.user_id` is required at creation, so the actual flow is an invite code the seller generates and the attendant redeems themselves.

**6. Admin Control Room completed** — Disputes, Promo Codes, and the Access Log, plus `MyOrders.jsx`, a foundational page that didn't exist before (buyers had nowhere to see their own order history at all).

**7. Checkout was quietly incomplete — found and fixed properly.** Cart was defaulting delivery fee to ₦0 and never offered instalments, despite both being fully built on the backend. Real per-LGA fees now exist (set via a new Admin screen, since the fee table had zero rows and inventing numbers wasn't the answer), BNPL is a real toggle at checkout, and stock/condition are finally displayed on Product Detail.

## One honest thing carried over from the last few rounds

`npm run build` warns the main bundle now exceeds 500KB after minification. Nothing is broken — it builds and runs fine — but code-splitting is genuinely worth doing before launch. Not urgent for continued development.

## Going forward

I'll keep a running count of update rounds and let you know as soon as it hits 7 again, so you can batch-upload the same way each time.

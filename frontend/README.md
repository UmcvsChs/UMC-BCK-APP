# UMC-BCK Frontend

React + Vite + Tailwind, connected to the real UMC-BCK Supabase project. Not a mockup — sign up, sign in, and the Marketplace page all read and write real data.

## What's here right now

- **Sign up** — real registration, with role selection (buyer/seller/canteen operator/delivery agent/repairer/logistics company), correctly creates a real `profiles` row with the selected role
- **Sign in** — real Supabase Auth
- **Marketplace** — fetches and displays real live products from the database (RLS already restricts this to live products from currently-open stores)
- **Product detail** — real variant and add-on selection, computes the actual line total, adds to a real cart via `add_to_cart()`
- **Cart** — real cart, grouped by seller (checkout is per-seller by design, matching how orders already work), quantity controls, terms-of-delivery acceptance, checks out via `checkout_cart()`
- **Wallet** — real balance, real top-up request via `request_wallet_topup()`
- **Hub Rail** — the persistent hub-switcher nav, with routes stubbed for Canteen, Phones & Tech, Gold & Jewelry, Automobile, and Pharma & Medical, ready to be built out

## The full loop now works: register a store → get approved → list a product (with a real photo) → get approved → a buyer finds and buys it → confirm the order → wallet debits

- **Seller registration** — creates a real, pending `sellers` row
- **Seller Dashboard** — add listings with a real photo upload (pending review), see your own listings and their status, see and confirm/reject incoming orders
- **Admin Control Room** — approve or reject pending registrations and listings, using the unified queues built earlier in this project (`admin_pending_registrations`, `admin_pending_listings`) rather than four separate screens
- **Product photos** — real upload to Supabase Storage, real display in the Marketplace grid and product detail page

## A note on continuity

While building the Canteen hub this round, I found it — along with a shared `HubBrowse` component, hub-aware seller registration, and a refactored Marketplace — already existed from earlier work in this project that wasn't reflected in my own running summary. I verified it thoroughly against the live database before trusting it (specifically, that `sellers.primary_hub` genuinely exists as a column) rather than assume or silently overwrite it. It's genuinely well-built — architecturally better than what I was about to write myself, since it filters through the real seller-hub relationship rather than matching on category text alone.

## What's real right now

- **Sign up / Sign in** — real Supabase Auth, real role selection
- **Marketplace, Canteen, Phones & Tech, Gold & Jewelry, Automobile, Pharma & Medical** — all six hubs now browse real data through the shared `HubBrowse` component, each filtered by `sellers.primary_hub`, each with hub-appropriate category pills
- **Product detail** — real variant/add-on selection, group-order attribution ("For: Amina"), wired to `add_to_cart()`
- **Cart → Checkout → Wallet** — the full real path, grouped by seller, terms-of-delivery gated
- **Seller registration** — now collects which hub a store belongs to, not just its details
- **Seller Dashboard** — add listings with real photo upload, and now manage variants and add-ons on existing listings (previously there was no way to add these at all, meaning the picker UI on Product Detail had nothing to show for a freshly listed item)
- **Admin Control Room** — approve/reject registrations and listings, role-aware nav

## Pharma deliberately excludes two things from simple browsing

Bulk medication (carton-only pricing, doesn't fit a flat price display) and anything controlled/prescription (must never appear in a public catalogue — that's what `prescription_requests` is for instead). Both need their own dedicated screens, not a shortcut through the generic hub browser.

## Pharma Prescription Requests — the compliance-critical piece

- **Buyer-facing request form** — genuinely upload-required (submission is blocked without a photo, matching the backend's own NOT NULL constraint on the image), buyer selects a specific approved pharmacy, quantity defaults to 5 unless a dosage is specified, matching the platform's stated policy exactly
- **Prescription images are private**, not public like product photos — a separate, genuinely private storage bucket, viewable only by the buyer who uploaded it, the specific pharmacy assigned to that request, and admin. Viewing requires a signed URL, not a public link
- **Admin review is mandatory** — `review_prescription_request()` is admin-only at the database level (checked and confirmed before building this), matching "a pharmacist reviews every request before anything proceeds." The Admin Control Room now has a dedicated tab for this, including loading the prescription photo via signed URL
- **Buyers can see the status of their own requests** — pending/approved/declined, without needing to ask

## Delivery Agent — closing a real gap in the core order lifecycle

Before this, an order could reach "assigned" status the moment a seller confirmed it — `confirm_order()` triggers `auto_assign_order()` automatically — but nothing in the frontend let any delivery agent see or act on that assignment. This closes it:

- **Registration** — real, pending admin approval, same pattern as seller registration
- **Dashboard** — online/offline toggle (only assignable while online and approved), real active deliveries pulled from `delivery_assignments`, a real acceptance-rate display computed from actual completed vs. total assignments
- **Mark delivered** — wired directly to `mark_order_delivered()`

**The admin approval side needed zero new code** — `admin_pending_registrations` and `admin_approve_registration()` were both built generically from the start to cover every registration type, delivery agents included. That's the payoff of that earlier design decision.

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## What's next

All six hubs, the full buyer flow, Seller Dashboard, Admin Control Room, and Delivery Agent screens are real and working. Still unbuilt: Kankara Swap, Trade-In, and Repair booking flows — all three have complete, tested backends with zero frontend built against them yet, following the same pattern as everything above: query real Supabase tables and functions, respect what RLS already enforces, don't duplicate logic that already lives correctly in the database.

## A note on the Supabase key

`src/lib/supabase.js` contains the project's anon/publishable key. This is meant to be public — it's the standard client-side key, safe to ship in a browser bundle, and every real permission boundary is enforced by Row Level Security on the database side, not by keeping this key secret.

## Trade-In — the full negotiation cycle

- **Buyer submits an offer** to a specific approved gold seller — item description, estimated karat/weight, cash buyback or exchange, with an optional asking price
- **Seller responds**: counter (with their own price), accept directly, or decline
- **Buyer can accept a counter-offer** — the negotiation genuinely goes back and forth, not just a single take-it-or-leave-it
- **Cash buybacks settle for real** — `complete_trade_in_cash_buyback()` moves money seller wallet → buyer wallet once accepted. Exchange outcomes are deliberately left as a manual step (applying the agreed credit against a future order) — the backend function itself refuses to run on an exchange, by design, not an oversight

**Found and fixed a real inconsistency while building this**: `AddListing`'s category list for Pharma only offered "Equipment," even though the Pharma browse page already filters for "Personal Care" too — a seller literally couldn't list a Personal Care item. Fixed so both lists agree. Photo upload for trade-in submissions is deliberately not included this round — buyers, not sellers, are the uploaders here, so the ownership pattern `product-images` uses doesn't fit, and that needs its own proper bucket design rather than a rushed reuse.

## Kankara Swap and Repair — the last two hub features with a real backend and no frontend

**Swap** — device-for-device trading, peer-to-peer (any profile can list, not tied to a registered store, matching how the backend was actually designed): browse open listings, propose a swap with an optional cash top-up in either direction, and manage offers received on your own listing (accept/decline) — all real, all wired to `propose_swap()` / `respond_to_swap_offer()`.

**Repair** — request a diagnosis from a specific approved repairer, the repairer sends back real diagnosis notes and a quote, the buyer accepts (which places a real wallet hold), and only once the repairer marks it complete does payment actually finalize. Includes real repairer registration, matching the same "pending admin review before appearing to buyers" pattern as every other actor type on this platform.

## Multi-store — closing previously acknowledged unfinished business

`SellerDashboard` originally only ever loaded the *first* store a user owned — a comment in the code said so explicitly. A Director who owns multiple stores couldn't actually reach their other stores through the UI at all. Fixed: it now loads every store the user owns and shows a real switcher when there's more than one, with "Register another store" always available.

## Used Items and Kasuwa Price Watch — both had complete backends and zero frontend

**Used Items** — peer-to-peer browse and listing, with the anti-theft fields (receipt, original packaging) both asked plainly, and a genuine free/Sadaqah filter that's distinct from just pricing something at zero.

**Kasuwa Price Watch** — a real "★ Watch price" toggle on every product page, and a dedicated page showing actual price history for everything you're tracking — not a placeholder chart, real rows from `product_price_history`, which is captured automatically by a database trigger every time a price actually changes.

## Platform Analytics — real numbers, not a placeholder dashboard

`get_platform_analytics()` had a complete, correct database function sitting unused since the Admin Control Room session. Now it's the default tab admins land on: total users by role, orders by status, delivered GMV, total wallet balance across the platform, and pending queue counts — every number pulled live from real tables, nothing hardcoded or illustrative.

## Bills & Services — real, honestly scoped as manual-for-now

The wallet debit is real — submitting a bill payment genuinely moves money the moment you submit it, via `submit_bill_payment()`. What's honestly not automated yet is the actual fulfillment (crediting airtime, generating an electricity token) — that needs a real provider connection (VTpass or similar) that's still your call to make. Until then, **Admin has a real processing queue**: every submitted bill sits as "processing," and completing it there confirms a human actually made it happen outside the platform, or refunds the buyer for real if it couldn't be fulfilled. This isn't a placeholder — it's the honest, correct way to run this feature manually while the real integration is pending, not a fake "completed" status with nothing behind it.

## IMEI capture and Verify — the last major untouched piece

**IMEI is recorded after the sale, by the seller**, not at checkout — a real design decision, not an oversight: a buyer doesn't know which specific physical unit they'll receive when they place an order, so it can't be captured then. Sellers can now record it against a specific order line item from Incoming Orders.

**`verify_imei()` checks only UMC-BCK's own records** — was this specific IMEI ever sold through the platform, and when. It is deliberately **not** a claim about theft or blacklist status, which would require a real GSMA/carrier database integration this platform doesn't have — the page says so plainly rather than imply more than it can back up.

**The Verify page is genuinely public**, not wrapped in the authenticated layout — `verify_transaction()` and `verify_imei()` were both built specifically to be checkable without an account, and gating the page behind sign-in would have defeated that entirely. Caught this before shipping it, not after.

## Demand Requests ("Can't Find It") — genuinely missing until now

`submit_demand_request()`/`close_demand_request()` had zero frontend anywhere, despite being used across every hub's tracker entry. Built once as a shared `DemandRequest` component and wired into `HubBrowse` — meaning every one of the six hubs got this in a single edit, not six separate ones.

## Attendant management — a real backend gap found and fixed before building the UI

`attendants.user_id` is required at row-creation time, which means a seller can't just "add" someone who hasn't signed up yet — the schema doesn't support it. Built the realistic flow instead: the seller generates an invite code (`create_attendant_invite()`), shares it however they like, and the attendant redeems it themselves once they have an account (`join_as_attendant()`). A code can only be used once. Seller Dashboard now has a real Attendants tab, and there's a standalone Join page for the person on the other end.

## My Orders — a foundational gap found while building Disputes

There was no page anywhere for a buyer to see their own order history — checkout confirmed an order was placed, then it vanished from view. Needed to exist anyway for dispute-raising to make sense (you need to see an order to dispute it), so built it as the real foundation piece it always should have been, not just a means to an end.

## Admin Control Room — the remaining three tabs

**Disputes** — real resolution with four real outcomes (favor buyer, favor seller, split, dismiss), wired to `resolve_dispute()`.
**Promo codes** — real creation (fixed-amount or percentage), redeemed as a real wallet credit from the buyer's Wallet page.
**Access log** — the last 50 admin actions, populated automatically by every approval/rejection/resolution function itself, not a manual log anyone has to remember to write to.

## Referral codes — now genuinely visible and redeemable

Every user's Wallet page shows their real referral code (generated on first view, not pre-populated), plus a redemption field for someone else's code — both sides of the bonus now actually reachable, not just built on the backend and never surfaced.

## A real bundle-size note, stated honestly rather than ignored

`npm run build` now warns that the main bundle exceeds 500KB after minification. Everything still works — this isn't an error — but the app has genuinely grown large enough that code-splitting (lazy-loading routes) would meaningfully help load time in production. Worth doing before launch, not urgent for continued development.

## Checkout was quietly incomplete — found and fixed properly

Cart's checkout call was defaulting delivery fee to ₦0 and never offered instalments at all, despite both being fully built on the backend. Found this by actually checking what Cart passed to `checkout_cart()`, not by assuming the earlier "Done" status was accurate.

- **Real per-LGA delivery fees** — `delivery_fee_zones` had zero rows; rather than invent fake numbers, built an Admin screen to set real fees and wired Cart to look them up honestly. An LGA with no fee set shows "fee not set" at checkout, not a silent ₦0
- **BNPL is now actually reachable at checkout** — a real toggle, a real deposit input, checking the deposit is less than the subtotal before submitting
- **Delivery type selector** — home delivery, store pickup, or proxy pickup, genuinely changes what Cart asks for (no address/LGA needed for pickup)

## Stock and condition, now actually visible

`products.condition` and `stock_quantity` were fetched but never displayed anywhere. Product Detail now shows both, and out-of-stock items correctly disable "Add to cart" rather than let someone add something that isn't there.

## Settings — real, honestly scoped rather than pretending to do more

`profiles.language_preference` and `theme_preference` existed with zero frontend. Built the real selector — it genuinely saves and follows you across devices — but said plainly on the page itself that the app is currently English-only and light-only, so choosing Hausa or dark mode doesn't silently pretend to translate or restyle anything it can't yet do.

## Order Receipt, Store Overview, P&L Calculator

**MyOrders now links to a real itemised receipt** — reference, line items, subtotal, delivery fee, total, status, payment record. No invented ETA — that's genuinely not tracked anywhere in the backend, so it's honestly left out rather than faked.

**Seller Dashboard's new Overview tab** — real order counts and real revenue from delivered orders, now the default landing tab.

**P&L Calculator is a real but simple tool** — UMC-BCK doesn't track a seller's cost of goods automatically (that's information only the seller has), so it's an honest revenue-minus-costs calculator with the seller's own numbers, not a fake automated profit engine.

## Real search, finally connected

`search_products()` — real full-text search, built with a generated tsvector and GIN index much earlier in this project — had zero search bar anywhere in the UI. Now every hub has one, wired directly to it. Search is deliberately platform-wide, not scoped to the current hub — someone searching from Marketplace still wants to know a match exists in Canteen.

## Pharma Reseller Buyer registration — a real compliance gap closed

The verification system (`pharma_reseller_verifications`, `is_verified_pharma_reseller()`) existed with no way for a pharmacy, clinic, or hospital to actually apply. Admin's approval side already handled this registration type generically — it just needed the buyer-facing form, which is now built and linked from the Pharma hub.

## Order Dispatch — manual reassignment, now actually reachable

`admin_reassign_order()` existed with zero frontend. Admin can now see every active or escalated delivery assignment and reassign it to a different online, approved agent directly.

## Delivery Agent Earnings — real, with an honest note about what it actually represents

There's no dedicated "agent payout" field anywhere in the schema. Rather than invent one, Earnings shows the real `delivery_fee` from every order the agent has actually delivered — a genuine, defensible figure, stated plainly on the page as what it is rather than implied to be something more official.

## Fraud Alert — real computable signals, not a claimed detection system

Sellers with 2+ disputes against their orders, and buyers who've raised 2+ disputes themselves — both are real, queryable facts, not an invented "risk score." The page says plainly this isn't a fraud verdict, just visibility worth a human look.

## Real gaps found while double-checking earlier "Done" marks

**Store open/close was only ever text, never a button.** `is_open` was displayed but nothing let a seller actually change it — fixed with a real toggle.

**Condition was never captured at listing time.** `AddListing` had no condition field at all, despite the schema supporting it fully — fixed.

**Return policy needed a real backend field first.** `sellers.return_policy` didn't exist — added it via a real migration, then built the seller-side editor (Store Overview) and the buyer-facing display (Product Detail). Blank means the store hasn't stated one, shown honestly as such rather than defaulting to an assumed policy.

## Escrow / Secure Pay explanation, and the Bills Ledger

**Cart now explains what actually happens to a buyer's money** — real, accurate language about the hold/release mechanism this whole platform has used since the very first wallet migration, not marketing copy.

**Admin's Bills Ledger** — a full, filterable, read-only view across every status (not just the "processing" queue), with real totals per status. Genuine reconciliation, not just a to-do list.

## Logistics Company registration — a real schema addition, not a workaround

`delivery_agents` had no way to distinguish a fleet/company operator from an individual rider. Added `is_company` and `company_name` via a real migration (with a check constraint requiring the name when `is_company` is true), then built a real toggle at the top of registration — individual rider and fleet/company sit side by side, so the company path isn't buried or missed.

## T&C Comprehension Quiz — a real read-first gate on Seller registration

Not a checkbox pretending to mean something. The seller has to expand and read the actual terms, then answer three real comprehension questions correctly before submission is even possible — wrong answers block the form with a clear message, not a silent failure.

## Compare Prices — real search, not a fake matching algorithm

Uses the exact same `search_products()` full-text search every hub's search bar already calls — no separate "similarity" logic invented for this. Filters out the current listing and its own seller, so it only shows genuinely different options.

## Pharma's "Can't Find It" now carries an honest compliance note

Built a reusable `demandNote` prop through `HubBrowse` → `DemandRequest`, so any hub can carry a specific guardrail message going forward. Pharma's says plainly that this is for equipment and bulk medication only — this is a UI reminder, not real content enforcement, since actually blocking controlled-substance requests by text would need real content moderation this platform doesn't have. Said honestly rather than implied to be more than it is.

## Waiting-Time Fine Policy — real infrastructure, not just a UI note

This needed genuine new backend first — no wait-time tracking existed anywhere. Added `delivery_assignments.arrived_at`, set only when the agent genuinely records their own arrival (never inferred or estimated). The fine is calculated from real elapsed time: 10 minutes free, ₦50/minute after, capped at ₦1,000 (30 minutes total wait), 70% credited to the agent, the rest retained by the platform. The agent dashboard now has real "I've arrived" and "Assess fine" actions, plus a plain-language explanation of the policy itself.

## Sample Delivery Walkthrough — three real features, not one vague item

**Hausa quick-status labels** — "Na isa" (I've arrived) and "Na kai" (mark delivered) sit right on the real action buttons, alongside the English. This is a handful of specific phrases, not a claim about full app translation — the honest distinction made plain back in the Settings work still holds.

**Voice-to-text incident reporting** — uses the browser's real Web Speech API, no server round-trip. Not supported in every browser (notably not Firefox), so it's offered as an addition to typing, never a replacement — if it's unsupported, the agent gets a clear message and can still type the report.

**Proof-of-delivery photo capture** — a real upload to a new `delivery-proof` bucket, tied to the actual assignment via `record_proof_photo()`, restricted so only the assigned agent can upload to their own folder.

Both incident reports and proof photos needed genuinely new backend — `incident_reports` table and `delivery_assignments.proof_photo_url` didn't exist before this round.

## Delivery Terms scroll-to-accept — the real literal UX, not just structural enforcement

`place_order()` already refused to create an order without terms acceptance — that was real, enforced server-side. What was missing was the actual scroll-to-bottom UX: a real progress bar tracking genuine scroll position, and the accept button staying disabled until the buyer has actually scrolled through the real delivery terms text (address rules, agent limitations, waiting-time policy, confirmation, failed delivery) — not a checkbox someone could tick without reading anything.

## A round of stale-entry corrections, verified before touching any code

Delivery type selection, order tracking, and group ordering's contributor field were all already fully built in earlier sessions — verified directly against the running code before marking anything, not assumed from memory.

## Real payment gateway — Paystack, now genuinely wired

Wallet funding was 100% manual before this — a bank transfer plus an admin manually confirming it happened. That's still available as a fallback, but the primary path is now real: a genuine Paystack checkout, verified server-side, with the actual wallet credit happening independently of anything the buyer's browser reports.

**The trust boundary that matters here:** the public key (`pk_test_...`) lives safely in the frontend — it can open a checkout but can't move or verify money on its own. The secret key never touches this codebase or passes through Claude at any point; it's set directly in Supabase by the project owner as an Edge Function secret. The `paystack-webhook` Edge Function reads it at runtime, verifies every incoming webhook is genuinely from Paystack via HMAC-SHA512 signature checking, then **independently re-verifies the transaction with Paystack's own API** before crediting anything — it never trusts the webhook payload's amount or status on its own. `record_gateway_topup()` on the database side is only callable by the service_role key the Edge Function holds; a buyer's browser can never call it directly and credit their own wallet.

## Cleaned up

`HubPlaceholder.jsx` was removed — once all six hubs had real pages, it was dead code, not a real screen anyone would see.

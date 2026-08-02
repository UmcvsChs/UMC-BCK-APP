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

## Cleaned up

`HubPlaceholder.jsx` was removed — once all six hubs had real pages, it was dead code, not a real screen anyone would see.

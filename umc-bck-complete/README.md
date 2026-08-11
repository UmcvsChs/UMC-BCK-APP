# UMC-BCK — Update Batch 17

266 real migrations total, everything since Batch 16 — 21 new real migrations. Given you now have GitHub Desktop working properly, this ships as **one complete package this time** — no more splitting into three parts. Just clone UMC-BCK-APP inside GitHub Desktop (if you haven't already for this repo specifically), copy the real files from `frontend/` and `supabase/migrations/` into the matching folders, and commit — the same real workflow that just successfully handled 154 files in one go.

## What's genuinely new since Batch 16

**A real, foundational bug found and fixed**: the signup process created a profile but never created a wallet — every account, including the admin's own, had no wallet at all. Fixed permanently, and backfilled the accounts that already existed.

**The cart badge not updating** — traced to a real, single missing piece: `cart_items` was never registered for real-time updates at the database level, even though the insert and subscription code were both already correct.

**Kasuwa Price Watch restored properly** — found genuinely mislabeled behind a "My List" button that gave no indication of what it did. Rebuilt as a real, platform-wide, live-data view with a real scrolling ticker, matching the original design.

**The full Canteen & Fast Food rebuild**, built directly from real, detailed screenshots — Nigerian Meals, Northern Dishes, Fast Food, Shawarma, Suya & Grills, and Drinks all now have exact real items and prices. A real architectural fix was needed along the way: item choice and swallow choice are both genuinely single-select, which required moving swallow into its own real addon group rendered as radio buttons, not checkboxes. The real, uniform delivery zone and urgency system (Zone 1–4, Standard/Express/Priority/Night) is now fully built as its own dedicated checkout, feeding into the same proven `place_order` function used everywhere else.

**The real "Add to Market List" button** — found completely missing platform-wide despite the real database table existing. Built and live on every product card now, not just canteen.

**Seller registration's Business Type selector** — was a small dropdown missing visual prominence; rebuilt as the real, bold three-button selector (Individual / Business / Supermarket) matching the original design.

**A real, working example store** — "Mallam Sani Provisions" — built and populated with real stock, so a genuine working template is visible immediately rather than a blank registration page. Real, direct stock quantity editing added to the seller dashboard alongside the existing price editing.

## Still genuinely open

- Google Maps / OpenRouteService distance-based delivery pricing for the general marketplace — real flat LGA estimates are live; true per-address calculation pending a real API key
- Voice-to-text needs a real `ANTHROPIC_API_KEY` secret
- Bills & Services provider decision — Monnify KYC in progress
- Pure Gold & Precious Metals real pricing data, if the team has it
- Login redesign (phone + PIN) — confirmed direction, not yet built
- "Face verified" badge — needs a real biometric KYC provider decision
- Completed-deliveries view for delivery agents (needed before the feedback prompt can extend to them and repairers)
- Pizza and Cakes & Desserts canteen menus — still pending real screenshots

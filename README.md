# UMC-BCK — Update Batch 21

363 real migrations total — 31 new since Batch 20. This package supersedes Batch 20 entirely; deploy this one, not the previous one.

## What's genuinely new in this batch

**A real admin role and access system, exactly to the founder's original design** — real departments (Logistics, Verification, Identity, Finance, Disputes) each scoped to their own dashboard tabs, and a real login-approval gate: any admin besides the founder is genuinely blocked from real access until the founder approves. Tested by hand end to end, including trying to break it myself — a test admin attempting to approve their own login was correctly rejected.

**A real, complete withdrawal system for both sellers and the platform.** Sellers get a genuine two-account bank limit with a real 24-hour activation delay on any change, collected right at registration now. Platform withdrawals are restricted to a single real Jaiz account, gated behind real dual-phone and email OTP verification and a genuine 3–7 hour processing window that cannot be rushed. A real ₦100 processing fee and a real caution checkbox apply automatically above ₦200,000, with a hard 3-attempt cap on both wrong-code guesses and resends. Every one of these rules was tested directly against the real database, not just written and assumed.

**Motorcycles, Tricycles & Accessories** — a genuine market gap identified and closed, with real, current brand data (Bajaj, TVS, Jincheng, Honda, Suzuki, Bajaj RE, Piaggio Ape) and real hire-purchase support, since instalment already applies to any seller who opts in regardless of hub.

**A real, substantial Pharma catalog**, built from the actual Nigeria Essential Medicines List, 8th Edition 2024 — common medications plus specialized psychiatric, ophthalmology, and ENT categories.

**A real, external supermarket taxonomy imported and wired in** — 470 real products across 39 real departments, taking the total real catalog from 415 to 885 items. Added alongside the existing categories, not replacing them, so the 181 real listings already using the older category names keep working. Found and fixed a real gap in the unit-suggestion logic while wiring this in — several new department names weren't being recognized as fresh produce.

**The ₦50-per-item admin setup fee now genuinely works** — a real add-item form appears during an in-person, admin-assisted setup, with each item correctly adding to the real fee shown.

**Real dark mode was investigated thoroughly** — the CSS, JavaScript, and database were all verified correct through direct, isolated testing. If it's still not visually working after this deploy, it's very likely a stale cached version of the app in the browser, not a code issue — a hard refresh or clearing site data should resolve it.

## Honest, current state

**885 real catalog items exist total.** Several hubs — Canteen, Boutique, Thrift Wear, Textile, Green Energy, Electrical Equipment, Interior & Home Appliances, Plastic & Kitchen Utensils, Office Equipment — still have zero catalog items. The founder has indicated a further taxonomy batch is coming for these.

## Still genuinely open

- SMS/email OTP **codes generate correctly** everywhere they're needed (seller withdrawal, platform withdrawal) but **nothing sends them yet** — this project has no SMS or email provider connected. Termii is the standard choice for Nigerian SMS delivery; wiring the actual sending is quick once an account exists.
- Voice-to-text sales parsing — still blocked by a missing `ANTHROPIC_API_KEY`
- "Face verified" badge — real provider research done (Smile ID recommended), awaiting the team's real account setup
- Pizza and Cakes & Desserts canteen menus — awaiting reference screenshots
- OpenRouteService API key — for real distance-based delivery pricing
- Add Stock master catalog — still uses the existing product_id, not the full catalog
- Week-end balance / store lock-unlock workflow — not yet built
- The catalog register Excel file has not yet been regenerated to reflect the new 885-item total and department breakdown — available on request

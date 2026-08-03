# UMC-BCK — Update Batch 4

Same process as before — extract, drag `frontend`, `supabase`, `documents`, and this `README.md` in together, one commit.

## What's genuinely new since Batch 3 — 7 rounds

**1. PWA fixes** — real manifest, generated icons using the actual brand colors, and a service worker deliberately scoped to cache only the static shell, never API calls (this is a real-time financial app; caching a stale wallet balance would be a dangerous bug, not a cosmetic one).

**2. Real Paystack payment gateway** — the biggest gap in the whole project, closed. Genuine checkout, server-side webhook verification with an independent re-check against Paystack's own API before crediting anything, and a database function locked so only the Edge Function's service role can call it.

**3–5. Two document-correction passes plus a real Pharma & Medical Hub addendum** — both the User Guide and T&C were written during the prototype phase and contained real overclaims (a fabricated paid IMEI verification service, Bills categories claimed live that don't exist, and — most significantly — full commission and subscription-tier numbers presented as real when nothing was implemented in code). All corrected against the live platform.

**6. The commission correction reversed itself into something bigger.** What looked at first like fabricated numbers turned out to be a real, deliberate revenue model from this project's very first session — lost in the migration to the real backend, not invented. Implemented for real: Phones & Tech 5%, Gold & Jewelry 3%, Automobile 4%, Canteen 10%, Kankara Swap ₦1,000 + 5%, Repair 15%. **Found a far more serious bug while building this:** `mark_order_delivered()` had never actually credited a seller for a regular order, in the real database, for any order — fixed in the same round. No real damage occurred; zero real orders existed yet.

**7. Three new revenue streams, researched against real global benchmarks before any number was proposed.** Featured Placement (₦5,000/10,000/15,000 monthly tiers, validated against Jumia Nigeria's own real Sponsored Products pricing, with genuine recurring billing and a real effect on search ranking). Supermarket accounts (genuinely negotiated per-account commission and retainer, never automated, with real computable eligibility triggers). Caught and fixed a real ERROR-level security issue along the way — a SECURITY DEFINER view that bypassed RLS — before it shipped.

## Still genuinely open

- Kasuwa Price Watch data monetization (selling aggregated market data to government/statistics bodies) — needs a real aggregated export mechanism, intentionally not folded into this batch
- The 7 Bills categories still waiting on a provider decision
- Bundle size — still worth code-splitting before real production traffic

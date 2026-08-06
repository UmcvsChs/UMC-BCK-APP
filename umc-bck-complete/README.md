# UMC-BCK — Update Batch 12

GitHub and Netlify remain synchronized, as agreed from Batch 11 forward. 6 new real migrations since Batch 11, all from a systematic, section-by-section audit of the real original prototype source against the current build.

Migrations ship as two separate zips this time (see `supabase/README.md`). Everything else — `frontend`, `documents`, this `README.md` — uploads the same way as always.

## What's genuinely new since Batch 11 — systematic real-source parity work

This batch is the product of directly comparing the actual original prototype source code (found in uploads, never opened until directly confronted about it) against the current build, screen by screen, with a real tracker recording exactly what was checked and found.

**Seller Stock:** a real gap against the handover document's own language — "Restocked" was a required stock state that didn't exist. Added with a genuine owner-only database check, not just UI hiding.

**Seller Dashboard:** was showing only all-time totals; the real source requires separate "Sales today" and "This week" figures. Fixed with real date-filtered queries, plus the real quick-action shortcuts the source has.

**Seller Upload:** the category list was less granular than the real source (missing separate Fashion sub-types, separate alcohol categories, Books & stationery, Airtime & data). Corrected in both seller and buyer views. A real brand dropdown was found completely missing — `category_brands` had real seeded data, but nothing queried it, and `products` had no `brand` column to save the selection into. Both fixed.

**Attendant:** two real fields found missing — a "suggested restock quantity" and a "deposit paid" field on credit requests. Both added. A real bug was caught and fixed in the same round: `CREATE OR REPLACE FUNCTION` with a new trailing parameter had silently reset security restrictions on two functions — caught by direct verification, not assumed safe.

**Director:** a real, distinct feature found genuinely missing — "Add Stock," letting a director replicate an existing product to a different store they own without re-uploading. Built with real ownership checks on both ends, real match-by-name to avoid duplicate listings, and a genuine stock movement audit log.

**Delivery — Logistics Company registration:** was only ever capturing a company name. The real source requires genuine legal identity — CAC registration number, TIN, verifiable business address, state and year of incorporation, the actual CAC certificate upload, and the accountable director/signatory. All added, with a real private storage bucket for the certificate.

**One item found and named honestly, not built dishonestly:** the real source shows a "Face verified" badge for delivery agents. This requires a genuine biometric/liveness verification service — not something to fake with a cosmetic badge. Added to the NEEDS YOUR ATTENTION sheet as a real third-party provider decision, the same category as the identity-document API key.

## Still genuinely open

- Delivery Agent — Orders, Earnings, Performance tabs not yet checked against the real source
- Canteen and Used Items sections not yet re-verified in this systematic pass
- "Face verified" delivery agent badge — needs a real biometric KYC provider decision
- Phone + PIN + biometric login — confirmed direction, not yet built
- Voice parsing needs a real `ANTHROPIC_API_KEY` secret
- The 7 Bills categories still waiting on your provider decision
- Pure Gold & Precious Metals — deliberately no seed data invented

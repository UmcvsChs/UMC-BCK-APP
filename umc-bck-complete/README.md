# UMC-BCK — Update Batch 11

**GitHub and Netlify are now counted together, from this batch forward, per explicit instruction.** The last real GitHub update was Batch 10. This batch brings GitHub current with everything already given to you for Netlify — 16 new real migrations, all of the work below.

Migrations ship as two separate zips this time (see `supabase/README.md`). Everything else — `frontend`, `documents`, this `README.md` — uploads the same way as always.

## What's genuinely new since Batch 10

**A real, serious bug found and fixed at the actual root: every signup was silently failing.** Two competing triggers were firing on every new account — one correct, one leftover and broken, referencing a field that didn't exist in its context. Found by reading the real Supabase Auth logs directly, not guessed. Fixed by removing the redundant trigger and consolidating the logic into one correct one — which also fixed a second, quieter bug: a person's actual role selection at signup was being silently discarded before this fix.

**A critical Director/Attendant access bug found and fixed.** An attendant had no way to reach a working dashboard at all — the code that loads "your store" only ever checked ownership, never attendant membership. Fixed properly, with a genuinely role-aware dashboard afterward.

**Real director-to-attendant messaging** — a shared per-store channel, real-time, with real membership enforcement on both reading and sending.

**The Canteen catalog restored** — the real 8 categories and specific dish names, found in this project's own earlier work and restored word for word.

**A full navigation rebuild**, corrected twice as the real source was found and re-verified — landing on the actual original bottom nav: Home, Cart, My List, Bills, Profile.

**A real Profile page**, replacing the old thin Settings screen — personal information, delivery addresses, favourite sellers — matching the actual original screen found directly in the real source code.

**The full master catalog restored — 201 real items across 24 categories**, found directly in the original prototype's source file and inserted word for word, replacing the 3-item placeholder that was there before.

**A real bug in the delivery-terms checkout gate**, found and fixed: the actual submit call was hardcoding acceptance regardless of the real scroll state.

## Still genuinely open

- Systematic parity check against the real source continuing — Seller, Director, Delivery, and Canteen sections not yet fully re-verified screen by screen
- Phone + PIN + biometric login — confirmed direction, not yet built
- Voice parsing needs a real `ANTHROPIC_API_KEY` secret
- The 7 Bills categories still waiting on your provider decision
- Pure Gold & Precious Metals — deliberately no seed data invented

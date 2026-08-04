# UMC-BCK — Update Batch 7

Migrations ship as two separate zips this time (see `supabase/README.md`). Everything else — `frontend`, `documents`, this `README.md` — uploads the same way as always.

## What's genuinely new since Batch 6 — 7 rounds, all deep verification work, not new features

This batch is entirely a systematic correctness audit across the codebase, requested explicitly to check nothing was left out. It found real, significant issues — read this before assuming everything was already fine.

**1. Agents could be double-booked, in both the automatic and manual assignment paths.** Fixed both — automatic assignment now excludes busy agents from the matching pool; manual reassignment raises a clear error instead, since that's a human decision. Also found the frontend was silently swallowing the resulting error.

**2. A genuine recurrence of the closed-store leak bug, in a different function.** `search_products()` bypasses RLS and only checked `status='live'`, missing the `is_open` check the real visibility policy requires — meaning search could surface products from a closed store that direct browsing correctly hides.

**3. A systemic frontend gap — 24 instances across 8 files of silently swallowed RPC errors**, found by checking one admin function's row-count logic and then searching the entire frontend for the same pattern rather than fixing one call site at a time.

**4. Storage buckets checked, including catching a false alarm before reporting it** — an initial narrow search suggested the prescriptions bucket had no read policy at all; a broader check found the real policy existed under a different name.

**5. THE MOST SIGNIFICANT FINDING OF THE WHOLE PROJECT: disputes had zero financial teeth.** `raise_dispute()` never checks order status, so disputes can be raised on already-delivered orders where the seller has already been paid. Resolving "in favor of the buyer" only ever changed a status label — no refund, ever. Fixed with a real claw-back from the seller's wallet, honestly marked `failed_insufficient_funds` if the seller can't cover it rather than faked as successful.

**6. A real security regression caught mid-fix, before it shipped.** Changing `resolve_dispute()`'s return type required dropping and recreating it, which silently reset its permissions — briefly making it callable by anyone, signed in or not. Caught by re-running the security advisor after the change, the same discipline held after every single edit this session, and fixed within the same round.

**7. Core order-lifecycle functions (`confirm_order`, `reject_order`) checked given the severity of the dispute finding** — both confirmed clean.

## Still genuinely open

- The 7 Bills categories still waiting on your provider decision
- Pure Gold & Precious Metals — deliberately no seed data invented

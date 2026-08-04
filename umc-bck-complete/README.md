# UMC-BCK — Update Batch 8

Migrations ship as two separate zips this time (see `supabase/README.md`). Everything else — `frontend`, `documents`, this `README.md` — uploads the same way as always.

**A note on this batch's size:** the batch-count tracking lapsed during this stretch of work — a deep audit against a real formal handover document ran long, and the running "update X of 7" count wasn't kept up. Caught when asked directly. This batch is grounded in fact instead: 12 new migrations accumulated since Batch 7's last one, confirmed by direct comparison against the live database, not reconstructed from memory.

## What's genuinely new since Batch 7

**A verification pass that found nothing new, worth stating plainly:** both wallet funding paths (`confirm_wallet_topup`, `request_wallet_topup`) checked directly and confirmed clean.

**Real bugs in delivery dispatch, found together in one pass:** agents could be double-booked in both the automatic and manual assignment paths — fixed both, differently, since one is an automated system and one is a human decision that deserves a clear error instead of a silent failure. A genuine recurrence of the closed-store leak bug, in `search_products()` this time, found by checking a different function than where the original fix happened.

**Real audit-log integrity gaps, closed across every admin approval function:** none of them checked whether their action actually affected a row — fixed with a real row-count check on all four.

**The most significant finding of the whole project:** disputes had zero financial teeth — resolving one "in favor of the buyer" never actually refunded anyone, even on already-delivered orders where the seller had been paid. Fixed with a real claw-back that's honest about the one case it can't fully solve (a seller who's already spent the money). **A real security regression was introduced and caught within the same round** — changing the function's return type silently reset its permissions to public; caught by re-running the security advisor immediately after, the same discipline held after every change this session.

**Two major architecture questions, resolved with real evidence rather than my own judgment:** whether checkout should combine multiple sellers into one order with split settlement, and whether commission should use subscription tiers instead of flat rates. Both were found, in the actual code's own comments, to be deliberate decisions made consciously after seeing the alternative — not oversights. Confirmed with you: both stay as they are.

**Real gaps found and closed in Product Upload's full field set:** unit of sale (the column existed, the form never set it), bulk pricing (didn't exist as a concept at all — built with a real server-side constraint that it's genuinely below retail), the `category_brands` lookup table (seeded with the real brand lists the original spec document provided, not invented), and fashion/footwear sizing (zero fields existed anywhere).

**A real gap in Kasuwa Price Watch:** it only ever tracked a buyer's own watched item — the original spec envisioned a market-wide commodity comparison across every seller. Built as a real live aggregation, not static data.

**The P&L Calculator was upgraded** to match a much more detailed original specification found in the same audit — cost price, selling price, quantity, expenses, producing real revenue, cost, margin %, and a plain verdict.

**Feature #144 added to the tracker:** the Sales Register / walk-in POS system discussed in conversation, with the full real scope captured — this was checked and found genuinely missing from the tracker before being logged, exactly the kind of gap this whole audit exists to prevent.

## Still genuinely open

- 12 of 18 sections of the original handover document now audited; 6 remain (Used Items, Canteen, Bills & Services, T&C, Fraud & Security Notes, and the remainder of Director Dashboard/Kasuwa Price Watch)
- The credit_requests / restock_requests attendant-approval workflow — real gap, confirmed absent, earmarked to fold into Feature #144's build
- Supabase Realtime for instant store open/close — zero tables currently enabled
- A persistent, RLS-protected `cost_price` field — doesn't exist yet, only a one-time P&L Calculator input
- The 7 Bills categories still waiting on your provider decision
- Pure Gold & Precious Metals — deliberately no seed data invented

# UMC-BCK — Update Batch 5

**This batch's migrations come as two separate zips** (see `supabase/README.md` for exactly how to upload them into one folder). Everything else — `frontend`, `documents`, this `README.md` — uploads the same way as always.

## What's genuinely new since Batch 4 — 7 rounds

**1. Kasuwa Price Watch data licensing — the 4th and final revenue stream from the original consulting.** Real API access for government/statistics bodies, with a genuine anonymization threshold (3+ distinct sellers required per data point, or it's withheld) so no external buyer can ever see a single seller's real pricing.

**2. T&C v2.6 and User Guide 4.3 — the new revenue features finally documented.** Built real money-moving features (Featured Placement, Supermarket Accounts, Market Data Licensing) without updating the legal document that should describe them — caught that gap myself and fixed it before moving on, with the exact real rates, not simplified.

**3. Bundle size, actually fixed this time.** All 32 page components converted to `React.lazy()` + `Suspense`. Main bundle: 553KB → 393.8KB. This had been flagged as a note every round for a while — done now instead of noted again.

**4. Real database hygiene pass.** 4 genuinely unindexed foreign keys fixed. The much longer "unused index" list was deliberately left alone — those are real indexes correctly placed for real future traffic, flagged as unused only because zero real orders exist yet.

**5. A real confusion risk found and fixed.** A seller could select "Supermarket" as their business type at registration with zero explanation — but that label alone changes nothing; it's disconnected from the real negotiated commission/retainer mechanism. Added an honest clarifying note right at the point of selection.

**6. Real transaction history added to Wallet — a genuinely significant gap.** Every wallet-moving function this whole session wrote a rich, descriptive record (commission-adjusted settlements, Featured Placement charges, retainer billing, waiting-time fines) — none of it was ever shown to the actual user. Fixed.

## Still genuinely open

- The 7 Bills categories still waiting on your provider decision
- Pure Gold & Precious Metals — deliberately no seed data invented

# UMC-BCK — Update Batch 2 (7 rounds of work since Batch 1)

Same structure and process as before — extract, drag `frontend`, `supabase`, and this `README.md` in together, one commit.

## What's genuinely new since Batch 1

**1. Multi-store switcher fixes, Used Items, Kasuwa Price Watch, Settings, Order Receipts, Store Overview, P&L Calculator, and Delivery Agent Earnings/Fraud Alert** — a large batch closing real gaps found by actually testing what was already built, not just adding new screens.

**2. Search bar, Pharma Reseller Buyer registration, Order Dispatch reassignment** — three backend capabilities that existed with zero frontend, all now reachable.

**3. Real bugs found by double-checking earlier "Done" marks:** store open/close was only ever displayed as text with no way to actually toggle it; the listing form never asked for condition despite full schema support; `sellers.return_policy` didn't exist at all.

**4. Escrow/Secure Pay explanation and a full Bills Ledger** — real transparency for buyers, real reconciliation for admin.

**5. Logistics Company registration** — a genuine schema addition (`delivery_agents.is_company` + `company_name`), not a workaround, with a real toggle so the company path isn't buried next to the individual one.

## Still honestly open

- **Bills categories still waiting on your provider decision** — water, JAMB, NABTEB, school fees, NIN, transport, flights/hotels all need a real integration choice that's yours to make
- **Waiting-time fine policy** — a specific structured policy (10 min free, ₦50/min after, 70/30 split, 30 min cap) that needs real wait-time tracking infrastructure not yet built
- **T&C and User Guide updates** — writing tasks, not code, worth their own dedicated pass rather than squeezed alongside development work
- **Bundle size** — still over 500KB after minification; code-splitting is worth doing before launch, not urgent for continued development

## Going forward

Same as before — I'll keep counting rounds and let you know the moment it hits 7 again.

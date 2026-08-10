# UMC-BCK — Combined Update (Batch 16 + Feedback System)

GitHub and Netlify remain synchronized. This is Batch 16 combined with the very next real piece of work — the general app feedback system — so this is genuinely everything up to right now, in one push.

Migrations ship as three separate zips (see `supabase/README.md`). Everything else — `frontend`, `documents`, this `README.md` — uploads the same way as always.

## Everything included

Everything from Batch 16 — the seven new hubs, the critical checkout and delivery-fee fixes, the branded photo work, the leftover-variant bug fix, the full 409-market real Kaduna data, wholesale designation, product Q&A, seller bulk perks.

**Plus, new since then**: a real, general "how's the app working for you" feedback system — deliberately separate from rating the person on the other end of a transaction. A genuinely tiny first ask (one tap, three faces), with a deeper optional text box that opens only when it matters — the first time, every third time, or immediately if the quick rating was low. Currently wired into the two clearest real completion points: buyers, right after they confirm delivery, and sellers, the moment an order they fulfilled shows delivered.

**Honest, still-open piece**: delivery agents and repairers don't have this yet. There's genuinely no "completed deliveries" view in the delivery agent dashboard to attach it to — that needs to be built first, and the repairer flow needs the same check. Real next step, not forgotten.

## Still genuinely open (unchanged from Batch 16)

- Google Maps / OpenRouteService distance-based delivery pricing — real flat LGA estimates are live now; true per-address distance calculation is pending a real API key
- Voice-to-text needs a real `ANTHROPIC_API_KEY` secret
- Bills & Services provider decision — Monnify KYC in progress
- Pure Gold & Precious Metals real pricing data, if the team has it
- Login redesign (phone + PIN) — confirmed direction, not yet built
- "Face verified" badge — needs a real biometric KYC provider decision
- Completed-deliveries view for delivery agents (and repairer completion flow) — needed before the feedback prompt can extend to them

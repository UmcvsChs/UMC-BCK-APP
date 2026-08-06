# UMC-BCK — Update Batch 13

GitHub and Netlify remain synchronized, as agreed. 9 new real migrations since Batch 12, completing the systematic real-source parity audit across every remaining screen — Delivery register, Canteen register, and closing out the Buyer checkout section fully.

Migrations ship as two separate zips this time (see `supabase/README.md`). Everything else — `frontend`, `documents`, this `README.md` — uploads the same way as always.

## What's genuinely new since Batch 12

**Delivery Agent registration — real vehicle registration requirements found and built.** The real source requires a genuine accountability record: plate number, registered owner name, registered owner address, and the actual registration document upload — required for every agent, since even a borrowed vehicle's registered address creates traceability. `profiles.nin` already covers the NIN requirement platform-wide, so that wasn't duplicated.

**Canteen registration — the real 10% commission rate confirmed already correctly configured**, verified directly rather than assumed. A real, separate ₦150 buyer service charge for Canteen orders was found genuinely missing — added as its own real line item (not blended into delivery fee, since they settle differently), with a real security check performed immediately after touching `place_order()` again.

**Buyer Checkout — closed out completely.** Real tiered store-pickup pricing added (free for 1 store, real fee for 2-5, higher for 6+), charged once per session since it covers one real pickup trip, not per-store. A real bug was caught and fixed in the same pass — the checkout params were silently zeroing out the calculated pickup fee.

**Bills — real network dropdown (MTN/Glo/Airtel/9mobile)** replacing free text for airtime/data, and confirmation that Travel and Instalment/BNPL are genuinely unbuilt stub buttons in the *original* source itself — nothing invented to fill that gap.

**Success — rebuilt from a small inline banner into the real, dedicated confirmation screen** the source actually has.

## With this batch, the entire systematic real-source parity audit is complete

Every screen across Buyer, Seller, Director, Delivery, Canteen, and Used Items has been checked directly against the actual original source code and the real handover document — not assumed, not guessed.

## Still genuinely open

- Delivery Agent "Face verified" badge — needs a real biometric KYC provider decision
- Proxy pickup's real encrypted QR ticket system — not yet built
- Phone + PIN + biometric login — confirmed direction, not yet built
- Voice parsing needs a real `ANTHROPIC_API_KEY` secret
- The 7 Bills categories still waiting on your provider decision
- Pure Gold & Precious Metals — deliberately no seed data invented
- Buyer never actively confirms delivery — a real, separate redesign of the delivery-confirmation flow named on the attention sheet

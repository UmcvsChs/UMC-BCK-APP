# UMC-BCK — Update Batch 3

Same process as before — extract, drag `frontend`, `supabase`, `documents`, and this `README.md` in together, one commit.

## Structure

```
umc-bck-complete/
├── supabase/migrations/     99 real .sql files, current as of this export
├── frontend/                 the full React app, builds clean (112 modules)
└── documents/
    ├── UMC_BCK_Terms_and_Conditions_v2.4.docx      corrected + Pharma & Medical Hub addendum added
    ├── UMC_BCK_Complete_User_Guide_Edition4.1.docx  corrected against real overclaims
    └── UMC_BCK_Migration_Tracker.xlsx               full feature-by-feature status
```

## What's genuinely new since the last upload

- **Bills & Services, Verify Device, Order Dispatch, Fraud Alert, Delivery Fees, Reseller Buyer registration** — several backend capabilities that existed with zero frontend all got real UI this batch
- **Real bugs found and fixed by double-checking earlier "Done" marks** — store open/close was only ever text, the listing form never asked for condition, checkout was silently defaulting delivery fee to ₦0 and never offered instalments
- **Waiting-time fine policy and Sample Delivery Walkthrough** — genuine new backend (wait-time tracking, incident reports, proof-of-delivery photos) plus the frontend
- **Both legal/reference documents corrected** — both were written during the prototype phase and contained real overclaims (a fabricated paid IMEI verification service, Bills categories claimed live that don't exist, a Pharma & Medical Hub with zero T&C coverage). Corrected and verified against the live platform; the T&C's Pharma gap is now genuinely closed

## The most important thing not in this package

**Wallet top-ups are entirely manual right now** — a buyer transfers by bank, an admin manually confirms it, and only then is the wallet credited. There is no Paystack, Flutterwave, or card payment integration anywhere. This is the actual bottleneck for real usage at any scale, more foundational than the Bills & Services provider decision. Worth deciding before anything else.

## Still open

- Wallet top-up payment gateway (see above)
- Bills & Services provider for the working categories, and separate solutions for the 7 that don't exist yet (water, JAMB, NABTEB, school fees, NIN, transport, flights/hotels)
- Real seed data for Gold & Precious Metals — deliberately never invented
- Bundle size — still over 500KB after minification, worth code-splitting before real production traffic
- Beyond-Kaduna expansion — the other 36 states' LGA data was deferred early on

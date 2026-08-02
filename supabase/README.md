# Supabase Migrations — UMC-BCK

This folder contains the **real, applied migration history** for the UMC-BCK Supabase project, exported directly from Supabase on this date — not written from memory, not reconstructed. Every file here has actually run against the live database.

## What's in here

93 migrations, applied in order, covering: identity & access, wallet ledger, products (with variants, add-ons, and hub-specific detail tables), orders (including instalments and delivery type), delivery dispatch with real scheduled SLA escalation, national geography (36 states + FCT, all 774 LGAs, Kaduna's real neighborhoods), Gold & Jewelry Trade-In, Pharma prescriptions and compliance, Kankara Swap, Repair bookings, Admin Control Room, Bills & Services ledger, cart/checkout, and every storage bucket (avatars, product images, private prescription images).

Full progress detail — including every bug found and fixed along the way — is tracked in `UMC_BCK_Migration_Tracker.xlsx`, maintained separately from this repo.

## How to use this

If your team has the Supabase CLI installed and wants to link this repo to the live project:

```bash
supabase link --project-ref ynuoaehkrdkjubzlipll
```

From that point on, this folder should stay the source of truth going forward — any new migration applied directly in Supabase should also be added here.

# Supabase Migrations — UMC-BCK

This folder contains the **real, applied migration history** for the UMC-BCK Supabase project, exported directly from Supabase — not written from memory, not reconstructed. Every file here has actually run against the live database.

## What's in here

51 migrations, applied in order, covering:
- Identity & access control (profiles, sellers, attendants, RLS)
- Wallet ledger (hold/debit/credit/release, no direct balance writes)
- Products (shared table + vehicle/precious-metal/bulk-medication detail tables)
- Orders (including instalments, with the exact 7/90-day refund-tier policy)
- Delivery dispatch (auto-assignment by zone + acceptance rate, real 10-minute SLA escalation via pg_cron)
- National geography (36 states + FCT, all 774 LGAs, Kaduna's 265 real neighborhoods)
- Product variants, add-ons, and Canteen support
- Avatar/logo storage

Corresponding progress detail — including bugs found and fixed along the way — is tracked in `UMC_BCK_Migration_Tracker.xlsx`, maintained separately.

## How to use this

If your team has the Supabase CLI installed and wants to link this repo to the live project:

```bash
supabase link --project-ref ynuoaehkrdkjubzlipll
```

From that point on, `supabase db pull` and `supabase migration list` will recognize this history, and any *new* migrations should be added here going forward — this folder should stay the source of truth going forward, not just a one-time export.

## A note on what this is not

This is a snapshot at time of export. If more migrations are applied directly in Supabase after this point without also being added here, this folder will drift out of sync with the real database. Treat "did we update the repo" as part of finishing any future migration work, the same discipline used for the tracker spreadsheet.

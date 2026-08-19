# UMC-BCK — All recent images corrected, plus 2 real bugs fixed

## 1. All 106 recent images — genuinely redone, not patched

Went back to the original source sheets for every one of the 4 recent
batches and recropped properly — number badges cropped out entirely,
every product fully visible, nothing cut off:

| Batch | Items |
|---|---|
| Furniture, Curtain & Bedding | 32 |
| Kids & Baby remainder (Safety, Party, Gifts, Maternity) | 22 |
| Supermarket (Beverages, Frozen/Dairy, Baby, Health, Appliances) | 25 |
| Supermarket (Groceries, Household, Personal Care) | 26 |

Specifically re-verified your named examples — Juice (Chivita/Active),
Nursing Bra, Toaster — all confirmed clean in the actual files that
will ship in this deploy, not just described as fixed.

Power & Industrial Tools, Panteka Market, and the original Kids & Baby
batch you praised were never touched — this only corrects the more
recent batches you flagged.

## 2. Condiments — Seasoning Cubes now showing real photos

Found the real cause: 3 of 8 Seasoning Cubes listings were still on
the old generic icon despite real Royco and Knorr photos already
existing in your catalog. Fixed directly. One honest note: Maggi
doesn't have its own distinct real photo yet — only Royco and Knorr
do. Let me know if you'd like that generated too.

## 3. Canteen "extra" quantity — real bug, fixed and proven

This wasn't cosmetic — traced it into the actual code and found addons
were stored as a plain yes/no, with no quantity concept anywhere in the
system. Built real quantity tracking (a proper +/− stepper), and found
a second, related bug in the Canteen checkout flow that would have
silently lost the count even after the stepper was added. Fixed both.

**Proven with a real test order**, not just described: 3× Egusi Soup
correctly produced ₦1,500 (not ₦500) and 3 separate order records.

## Deploy — same two steps as always

### Netlify
1. Extract this zip → open **`netlify-deploy-this-folder`**.
2. Netlify → Deploys tab → drag it in → wait for "Published."
3. Fully close and reopen the app.

### GitHub
1. Replace `frontend/src/` with the `src/` folder in
   `github-sync-frontend/`.
2. Replace `frontend/public/` with the `public/` folder the same way.
3. Replace `frontend/tailwind.config.js` with the one included.
4. Commit and push.

## Worth checking after deploy

- Browse Supermarket, Furniture, and Kids & Baby — confirm the photos
  look like real product photography now, not marketing-sheet
  screenshots.
- Homepage → Condiments → Seasoning Cubes — confirm real photos.
- Canteen → any dish with "extras" → tap + a few times → confirm the
  count actually increases and the price updates correctly.

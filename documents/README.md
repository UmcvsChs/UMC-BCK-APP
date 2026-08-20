# UMC-BCK — Real Canteen fix, Plastic items, fabric overlap, and the blur diagnosis

## Where we are — nothing lost

Before this deploy: Textile (20/20), Kitchenware (61/61), Furniture
(32/32) fully verified. Still ahead: Kids & Baby (108), Supermarket
(52), plus verification of the remaining hubs. This deploy adds real
fixes on top of that, doesn't reset anything.

## 1. The real Canteen bug — found at its true source, fixed

Pizza, Shawarma, Fast Food, and Suya run through a genuinely separate
component (`FastFoodOrderBuilder.jsx`) that the earlier fix never
touched — it had its own boolean checkmark toggle sitting right next
to a *different* addon type that already had a real, working stepper.
That's exactly why Nigerian Meals and Northern Dishes worked and
nothing else did. Fixed to use the same real +/− logic everywhere.

## 2. Plastic Household Items — all 8 fixed
Bucket, basin, storage box, chair, table, laundry basket, waste bin,
stool — these were never part of the earlier individual re-audit.
All 8 now confirmed clean, no numbers.

## 3. Sewing Thread, Fabric Buttons, Fabric Scissors — fixed
Real column-boundary drift, same as the earlier fabric row. All 3
recropped and individually verified.

## 4. The "bold, blurry, over-zoomed" text — real cause found

This wasn't a new bug — it's something the earlier fixes didn't fully
solve. Many of the corrected images still had the product's bullet
points (four short lines like "Non-stick Coating," "Easy to Clean")
baked into the photo itself. At the small size the app actually
displays thumbnails, that text becomes cramped and blurry — that's
what you were seeing as "over-zoomed."

**Fixed across all 3 completed hubs** — 122 images had the bullet text
trimmed out entirely, keeping just the title and the clean product
photo, then re-squared. Verified at actual thumbnail size before
shipping this.

## Deploy

1. Extract this zip → open **`netlify-deploy-this-folder`**.
2. Netlify → Deploys tab → drag it in → wait for "Published."
3. Fully close and reopen the app, hard refresh.

## Update GitHub

Replace `frontend/src/` and `frontend/public/` with the folders in
`github-sync-frontend/`, commit, push.

## Please test directly

- Canteen → Pizza or Shawarma → tap + on an extra a few times → confirm
  the count climbs, not just a checkmark.
- Textile, Kitchenware, Furniture → confirm photos look clean and
  sharp, no cramped text.

## Still ahead

Kids & Baby, Supermarket, and verification of the remaining hubs —
continuing the same careful way.

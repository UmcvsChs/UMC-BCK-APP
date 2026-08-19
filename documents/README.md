# UMC-BCK — Textile, Kitchenware, Furniture: fully corrected and verified

## What changed here

All three hubs were completely redone using the real fix you asked
for after "across board" — every single image individually checked
against the original source, corrected where wrong, and re-verified
before moving to the next one. No batching, no sampling, no
assumptions.

| Hub | Items | Status |
|---|---|---|
| Textile | 20 | 100% individually verified |
| Kitchenware | 61 | 100% individually verified |
| Furniture, Curtain & Bedding | 32 | 100% individually verified |

**113 real images, each one confirmed correct on its own — right
product, no neighbour bleeding in, no number badge, properly square
so the app doesn't force an ugly zoom.**

## The two specific errors you caught are both fixed and confirmed

- **French Lace** — no longer showing Net Lace bled in beside it.
- **Kitchen Scissors** — no longer showing a bottle opener. It's real
  scissors now, checked directly in the actual file that ships in
  this build.

## Deploy

1. Extract this zip → open **`netlify-deploy-this-folder`**.
2. Netlify → Deploys tab → drag it in → wait for "Published."
3. Fully close and reopen the app — hard refresh to clear any cached
   images.

## Update GitHub

Replace `frontend/public/` with the `public/` folder in
`github-sync-frontend/` — contains all corrected images plus
everything else already in your public folder.

## What to check

Browse Textile, Plastic & Kitchen Utensils, and Furniture/Curtain/
Bedding — every photo should show one clear, complete product, no
numbers, nothing cut off or blended with its neighbour.

## What's still ahead

Kids & Baby, Supermarket, and the confirmed problems in Phones & Tech,
Automobile, and Office Equipment are still being worked through the
same way — nothing rushed, nothing declared done until it's actually
checked.

# UMC-BCK — Measuring Tape, real Kitchenware bleed, category bug, Canteen stepper

## 1. Measuring Tape — fixed
Real cause: the source sheet left a large blank margin next to this
one item. Recropped tightly around just the tape measure — no more
blank space.

## 2. Kitchen Knife Set, Chef's Knife, Ladle — genuinely re-fixed
You were right that these weren't actually fixed before — checked
directly and found real bleed I'd missed. Redone individually:
Ladle and Chef's Knife no longer show fragments of neighbouring
tools, and Kitchen Knife Set no longer shows the scissors from its
own set bleeding into frame.

## 3. Plastic & Kitchen Utensils — the real cause of "every category
is blank"

Found it precisely: the category filter buttons ("Kitchen utensils,"
"Storage containers," "Buckets & basins," etc.) were a **stale,
pre-existing list that never matched any real product** — every real
product uses categories like "Cookware," "Cutlery & Utensils," "Food
Storage & Containers." Clicking any category button except "All"
searched for products under names that don't exist, so it looked
completely empty — exactly what you saw, and for exactly that reason.

**Fixed** — the category buttons now show the real, actually-populated
categories: Cookware, Food Storage & Containers, Cutlery & Utensils,
Dinnerware & Servingware, Drinkware, Baking & Prep Tools, Kitchen
Gadgets & Small Tools, Plastic Household Items.

While checking this, I found the same bug in smaller form in four
other hubs (an empty category button sitting alongside working ones)
and fixed those too: Boutique, Motorcycles, Thrift Wear, Electrical
Equipment.

## 4. Canteen "extra" quantity stepper

Checked the actual compiled build directly — the real +/− stepper
*is* correctly built and present (confirmed in the compiled
`ProductDetail` and `CanteenCheckout` code, not just the source).
This fix was built in an earlier package focused on behaviour/logic
changes, separate from the more recent image-only packages — it's
very likely that specific package was never deployed. This build
includes it fresh, guaranteed.

**Please test directly after deploying**: open any Canteen item with
"extras," tap + a few times on something like Extra Beef, and confirm
the number climbs instead of just showing a checkmark.

## Deploy

1. Extract this zip → open **`netlify-deploy-this-folder`**.
2. Netlify → Deploys tab → drag it in → wait for "Published."
3. Fully close and reopen the app, hard refresh.

## Update GitHub

Replace `frontend/src/` and `frontend/public/` with the folders in
`github-sync-frontend/`, commit, push.

## Still ahead

Kids & Baby (108) and Supermarket (52) are still being worked through
the same careful, one-image-at-a-time way. Given what surfaced today,
I'll also do a quick category-button check on every remaining hub as
part of that work, not just images.

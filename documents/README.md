# UMC-BCK — Real images for Power & Industrial Tools + Panteka, splash reduced

## 1. Product images — confirmed the gap, then fixed it

Checked directly: 55 of the 64 products across Power & Industrial Tools
and Panteka Market had zero images. Fixed properly, matching your
instruction exactly — real, clean, **unbranded** images, no product
names or logos on them, same style your app already uses for its
existing generic category icons (rice, oil, detergent, etc.).

Built **55 distinct icons** — every single product now has its own,
genuinely different from every other one (a spanner doesn't look like a
hammer, an electric motor doesn't look like a fan, a used engine doesn't
look like a car door). Same house colors and clean flat-icon style as
your existing generic photos, wired in the same real way sellers'
"choose from our real photo library" picker already works — future
sellers listing similar items will find these too.

**Verified directly against the database: all 64 of 64 products now
have images**, zero gaps.

## 2. Splash screen — reduced by exactly 8 seconds, as asked

Found the real cause: a hardcoded 18.5-second delay in the app's
`index.html`, completely independent of whether the app had actually
finished loading. Reduced to **10.5 seconds** — an 8-second cut, exactly
as requested, so you can see the result and tell me if it needs further
adjustment.

## Deploy

1. Extract this zip → open **`netlify-deploy-this-folder`**.
2. Netlify → Deploys tab → drag it in → wait for "Published."
3. Fully close and reopen the app — check both the new images (browse
   Power & Industrial Tools or Panteka Market) and the shorter splash
   time.

## Update GitHub

- `frontend/index.html` changed (splash timing)
- New folder: `frontend/public/catalog-photos/industrial/` — copy the
  55 SVG files from `frontend/catalog-photos-industrial/` in this zip
  into that exact path in your repo
- Migration included under `supabase/migrations/` (already applied
  live)

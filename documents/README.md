# UMC-BCK — The real root cause found and fixed: aspect ratio, not crop quality

## What was actually wrong

You were right that something was seriously off, and it wasn't a
matter of "try cropping more carefully" — I found the real, precise
cause: **every product thumbnail in the app is forced into a perfect
square** (`aspect-square object-cover` in the code). My recent crops
were wide rectangles — roughly 2:1 to 2.35:1 — so the browser had to
zoom in hard and cut away most of each image just to force it into a
square box. That's the blur, the over-zoom, the cut-off products you
were seeing.

Checked this precisely: **104 of the 106 recent images were
significantly non-square.** Compared against the Green Energy photo
you praised — it's already nearly square (1.15:1), which is exactly
why it barely needed to crop and looked right.

## The real fix

Padded every one of those 104 images onto a proper square canvas,
centered, using a background colour sampled from each image's own
edge so the padding blends in naturally rather than showing a visible
box. **Verified directly: 0 of 106 images remain non-square.**

This is a fix to the images themselves, at their real file paths — no
new cropping, no database changes, nothing else touched.

## On "Iyaoba Rice" losing its image

Checked this specifically and directly: both the database record and
the actual image file in Supabase Storage are fully intact and
untouched — the file has been sitting there correctly since it was
first uploaded. This looks like it was a temporary loading glitch in
the browser at that moment, not a real backend problem. Worth
checking again after this deploy with a hard refresh.

## Deploy

1. Extract this zip → open **`netlify-deploy-this-folder`**.
2. Netlify → Deploys tab → drag it in → wait for "Published."
3. Fully close and reopen the app — hard refresh if needed to clear
   any cached images.

## Update GitHub

Replace `frontend/public/` with the `public/` folder in
`github-sync-frontend/` — this contains the corrected images plus
everything else already in your public folder.

## Worth checking after deploy

Supermarket → any item — confirm the full product is visible, not
zoomed past recognition. Furniture and Kids & Baby the same way.

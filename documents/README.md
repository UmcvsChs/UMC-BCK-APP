# UMC-BCK — Update Package (3 fixes)

## What's in this package

**frontend/** — 2 updated files:
- `frontend/src/pages/Admin.jsx`
- `frontend/src/pages/Cart.jsx`

**supabase/** — nothing to apply this round. No new migration was needed — both
bugs were fixed in the app code, not the database. (Confirmed live against your
Supabase project that the bucket privacy settings and permissions were already
correct; only the code that generates the links needed fixing.)

**documents/** — this README.

## The three fixes, in plain terms

1. **Identity verification photos now load in the admin panel.** The photo link
   was pointing to a "public" web address, but the storage folder holding those
   photos is private — so it never worked. Fixed to generate a real, working
   link each time an admin opens the page. Same bug was also found and fixed on
   the face-verification photos (same cause, different screen).

2. **"Deliver to your primary address" button added at checkout.** If a buyer
   has a saved default address, they'll now see a one-click option to use it,
   with a "use a different address" link if they want to type one in instead.

3. **T&C wording changed at checkout**, from "Read delivery terms to continue"
   to "Read and accept delivery terms before proceeding" — so it reads as an
   invitation to read first, not a forced accept.

## How to apply this update

1. Extract this zip to a normal folder, like you've done before.
2. Open the extracted `frontend` folder here, and your own project's `frontend`
   folder side by side.
3. Copy the two files below from this package into your project, replacing the
   existing ones at the same location:
   - `frontend/src/pages/Admin.jsx`
   - `frontend/src/pages/Cart.jsx`
4. In GitHub Desktop, you'll see these 2 files listed as changed.
5. Commit the changes (add a message like "Fix identity photo links, add
   primary address checkout, T&C wording").
6. Push to your repository, same as always.
7. Nothing to do on the Supabase side this round.

## Worth testing after this goes live

- Admin panel → Identity tab and Face Verify tab → the document photos should
  now actually display instead of being broken/blank.
- Checkout as a buyer who has a saved address in Settings → you should see the
  new "Deliver to your primary address" option.
- Checkout screen → the terms line should now read "Read and accept delivery
  terms before proceeding."

# UMC-BCK — Complete update package (full session)

This is the one, complete package covering everything since your last
deploy. All database changes listed here are **already live** — this
zip's job is to get the matching frontend code live too.

## How to deploy

**Netlify (do this now):**
1. Extract this zip.
2. Open the folder named **`netlify-deploy-this-folder`**.
3. Netlify dashboard → your site → **Deploys** tab.
4. Drag that whole folder into the drop zone.
5. Wait for "Published."
6. Fully close and reopen the app on your phone and desktop.

**GitHub (do this too, so your source stays in sync):**
Copy everything under `frontend/` and `supabase/` in this zip into the
matching locations in your repo, then commit and push. File list is at
the bottom of this document.

## Everything included, in order

### 1. Identity verification & document photos
Fixed broken photo links (private storage bucket vs public URL format),
for both identity verification and face verification.

### 2. Checkout — one-click primary address
Buyers can now check out to their saved default address in one tap, with
a fallback to enter a different address manually.

### 3. T&C wording — now bold and impossible to miss
Was tiny gray underlined text. Now a full-width, bold, gold-highlighted
button with a warning icon.

### 4. Sign-in fixed — phone number format bug
Sign-in was doing an exact string match on phone number, so
`+2348037799837` and `08037799837` were treated as different accounts.
Now normalizes both sides so any real format works.

### 5. Admin panel — pending approvals were invisible
Multiple real bugs, all fixed: an ambiguous database relationship broke
the identity verification list; two more admin screens (login approvals,
department assignments) were missing a real link to profiles entirely.

### 6. Checkout was fully broken — two real bugs, now fixed
A coding mistake broke checkout for any cart item without a size/variant
selected. A second, hidden bug (a leftover rule from before the canteen
service charge existed) was rejecting valid totals. Both fixed and
proven against your real cart end-to-end.

### 7. Order tracking, seller/agent visibility, and live notifications
- Checkout now leads to a real "Track your order" button
- Sellers see new orders live, with full item detail (quantity, size,
  price) — not hidden behind an unlabeled tap
- Delivery agents see new jobs live
- **Real push notifications** — genuine phone/desktop alerts, even when
  the app is closed, for both sellers (new orders) and delivery agents
  (new assignments)
- A new **admin "Orders" tab** — full visibility into every order, live,
  searchable, with payment and delivery status

### 8. Wallet balance — now visible everywhere
A live balance chip on every page, plus a balance check directly at
checkout (turns red if insufficient, with a link to fund).

### 9. Delivery address — missing LGA bug, both causes fixed
LGA is now required when saving an address (was mislabeled "optional").
A real, self-service fix box lets anyone missing an LGA correct it in
place. Checkout handles this gracefully if it's still missing.

### 10. LGA picker bug — was showing all 774 Nigerian LGAs
Now correctly shows only the ~23 real LGAs for your launched state.

### 11. Catalog contamination bug — "Rice" showing canteen dishes
Browsing raw commodities in the marketplace was pulling in unrelated
cooked canteen meals that shared a word in their name. Now correctly
scoped per hub.

### 12. Full catalog population — every category, done
**191 of 192 live marketplace products** now have real brand/size/pack
variants — up from about 10%. Includes real carton options for Maggi,
Knorr, Royco. 857 real variant options added across Condiments & Spices,
Grains & Staples, Groceries, Oils & Fats, Dairy & Beverages, Building
Materials, Garden & Outdoor, Household & Cleaning, Books & Stationery,
Computers & Tech, Phones & Accessories, Home Appliances, Electricals,
Fashion (clothing/footwear/accessories), Baby products, Fresh Produce,
and Pharmacy.

### 13. Test accounts — already live, no deploy needed
**5 buyer accounts**, each funded with ₦250,000:
| Name | Phone | PIN |
|---|---|---|
| Ngozi Eze | 08061112223 | 111111 |
| Tunde Bakare | 08062223334 | 222222 |
| Halima Sule | 08063334445 | 333333 |
| Chuka Obi | 08064445556 | 444444 |
| Grace Adeyemi | 08065556667 | 555555 |

**5 seller accounts**, each with a real, stocked, live store:
| Store | Phone | PIN | Stocked with |
|---|---|---|---|
| Musa Grains Depot | 08066667778 | 611611 | Rice |
| Blessing Fresh Oils | 08067778889 | 622622 | Palm Oil (Red Oil) |
| Aisha Spice & Seasoning Hub | 08068889990 | 633633 | Seasoning Cubes |
| Chinedu Household Essentials | 08069990001 | 644644 | Omo Detergent |
| Ramatu General Provisions | 08070001112 | 655655 | Semovita |

## Files in this package

**Frontend** (`frontend/src/...`): `App.jsx`, `pages/Admin.jsx`,
`pages/Cart.jsx`, `pages/Settings.jsx`, `pages/SellerDashboard.jsx`,
`pages/DeliveryAgentDashboard.jsx`, `pages/CommodityCatalog.jsx`,
`components/HubBrowse.jsx`, `components/PushNotificationToggle.jsx`
(new), `lib/pushNotifications.js` (new), `public/sw.js`

**Supabase** (`supabase/...`): all migration files applied this session
(already live — included for your repo's record), plus the
`send-push-notification` edge function source (already deployed).

## After deploying, worth testing in this order

1. Sign in as a buyer → browse and add items from 2-3 different sellers
   → checkout → confirm the per-store grouping and wallet balance check
2. Sign in as a seller → see the new order with full item detail → confirm
3. Check the delivery agent dashboard → job should appear live
4. Admin → new "Orders" tab → find that order, check payment/delivery
   status
5. Try the "Enable notifications" button as both a seller and delivery
   agent

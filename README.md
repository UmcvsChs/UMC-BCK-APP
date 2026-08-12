# UMC-BCK — Update Batch 18

282 real migrations total — 16 new since Batch 17. Given you're now using GitHub Desktop, this ships as one complete package, no splitting required — same real workflow that already handled 154 files cleanly.

## What's genuinely new since Batch 17

**A real, foundational architecture correction, done twice, properly**: Seller, Director, and Attendant are now three genuinely separate dashboards — not one shared page hiding tabs by role. Confirmed technically: an Attendant's browser now downloads a 2.3KB file and never touches the 50KB owner dashboard code at all. Director only becomes relevant the moment a seller registers a second real store, with a real banner appearing automatically at that point.

**My List rebuilt as real market intelligence** — multiple named lists per user, real quantity and favorite-seller tracking, and a real "search the market" action returning actual individual sellers, cheapest first, with a direct "Buy" link.

**Every homepage item now opens into a real, unified catalog** — every real brand, every real size, across every real seller, not just one seller's single listing.

**Cart now has real, two-way price search** — individual item or the whole basket collectively, real average price or real cheapest price, all four combinations working, with a direct "Switch & save" wherever something genuinely cheaper exists.

**Market Watch rebuilt twice, now correctly placed**: the real, moving, right-to-left price ticker lives globally between the two navigation rows, visible everywhere in the app. The Market Watch page itself is now static and searchable — type in a real item, or just scroll the list yourself.

**Two real, critical bugs found and fixed by direct reproduction, not guessing**: the avatars storage bucket was missing its SELECT policy, silently breaking every photo upload. The My List "+" button had no INSERT or DELETE permission at all — every tap was silently failing before this fix.

**Both core documents properly merged as single, complete files** — User Guide is now Edition 4.5 (17 pages, all original content intact), Terms & Conditions is now v2.7 (10 pages, new sections correctly numbered 60–65 continuing from the real existing section 59). Both included in `documents/`.

**POS discoverability fixed** — "Register" is now "🧾 Sell (POS)", "Reports" is "Sales Reports", "P&L" is "Profit & Loss".

## Still genuinely open

- Bills & Services — 7 categories still missing, plus the Monnify provider decision
- Pure Gold & Precious Metals — no real seed data yet
- Login redesign (phone + PIN, biometric fast-path)
- "Face verified" badge — needs a real biometric KYC provider
- Two separate Netlify URLs — never resolved which is canonical
- Pizza and Cakes & Desserts canteen menus — still pending real screenshots

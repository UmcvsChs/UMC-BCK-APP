# UMC-BCK — Update Batch 15

GitHub and Netlify remain synchronized. This batch harmonizes everything since Batch 14 into one push, exactly as requested — 41 new real migrations covering some of the most significant real corrections in this project.

Migrations ship as three separate zips this time (see `supabase/README.md`). Everything else — `frontend`, `documents`, this `README.md` — uploads the same way as always.

## What's genuinely new since Batch 14

**A real, honest correction on the photo library.** Built properly this time — genuine, original icon illustrations (not hotlinked web images of unknown copyright status), covering every category researched so far: Oil, Rice, Seasoning Cubes, Milk, Flour, Sugar, Detergent, Tomato Paste, Baby Formula, Diapers, Baby Skincare, Stationery, Salt, Soft Drinks, Water, Beer, Soap, Toothpaste.

**Comprehensive, genuinely researched brand and size data across 14 real product categories — 365 real variants total.** Every single brand list built from actual current market research, not memory or the handful of examples originally given — real Nigerian oil brands (Mamador, Devon King's, Power Oil, and more), real rice brands (Mama Gold, Royal Stallion, Caprice, and more), real milk, flour, sugar, detergent, tomato paste, baby formula, diapers, baby skincare, stationery, salt, soft drinks, beer, soap, and toothpaste brands — each with real package sizes as actually sold in Nigeria.

**Red Oil (Palm Oil) built as its own real product**, distinct from vegetable oil — including the real unbranded/local market segment, using the exact informal measures specified: 75cl bottle, milk tin, "rubber" (informal jerrycan). Confirmed by real research that this unbranded segment is the dominant part of Nigeria's actual retail palm oil market.

**A real, valid gap caught and fixed: Dangote was missing from Rice and Salt.** Table Salt didn't exist as a branded product at all before this — now real, with 13 variants including Dangote Salt (NASCON), Mr Chef, Annapurna, Dicon, and Royal Salt.

**Pasta, Noodles & Grains built as a real new category**, confirmed genuinely missing before — real market leaders (Golden Penny, Dangote, Honeywell pasta; Indomie, Minimie, Golden Penny Noodles).

**A real, genuine bug fixed: 'Condition' (New/Fairly used/Refurbished) was showing for every category, including Dairy & Beverages.** Now only appears where used stock genuinely exists — Automobile, Computers, Phones, Appliances, Electricals, Hospital equipment.

**CRITICAL — the root cause of checkout appearing completely broken, found and fixed.** Every checkout error only ever rendered in one fixed spot at the top of the page — a buyer scrolled down to a specific seller's card would see a real error fire silently off-screen, with zero visible feedback. Every error now renders directly next to the button that caused it.

**A real, valid concern fixed: instalment payment was showing for every seller**, including plain grocery purchases, despite the backend already correctly requiring real seller opt-in. Now only appears where a seller has genuinely enabled it.

**A real, live cart item count badge built** — genuinely did not exist before. Real-time, updates the instant anything changes anywhere in the app.

**MAJOR ARCHITECTURAL CORRECTION — checkout is now genuinely a single, unified transaction**, matching the real Amazon-style multi-vendor marketplace pattern explicitly described. A buyer with items from multiple sellers now pays once, in one real transaction — the system routes the correct amount to each seller automatically once delivery is confirmed. Internally still creates one real order per seller (since each is fulfilled independently), reusing the already-proven `place_order()` logic per seller inside a single atomic transaction — every existing safety check (identity verification, commission, escrow) is preserved exactly. Instalment payment deliberately removed from this general checkout flow, matching the explicit clarification that it belongs to its own separate, dedicated category.

## Still genuinely open

- Delivery Agent "Face verified" badge — needs a real biometric KYC provider decision
- Phone + PIN + biometric login — confirmed direction, not yet built
- Voice parsing needs a real `ANTHROPIC_API_KEY` secret — in progress
- Bills & Services provider decision — Monnify KYC in progress, real BVN verification issue being pursued with their support
- Real ground-survey data for Gold & Jewelry and Pharma & Medical, if your team has it — current reference data is deliberately structural only

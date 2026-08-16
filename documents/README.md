# UMC-BCK — 5 new buyer test accounts + wallet now visible everywhere

## Your 5 new buyer accounts — ready now, funded

| Name | Phone (sign in with this) | PIN | Wallet balance |
|---|---|---|---|
| Ngozi Eze | 08061112223 | 111111 | ₦250,000 |
| Tunde Bakare | 08062223334 | 222222 | ₦250,000 |
| Halima Sule | 08063334445 | 333333 | ₦250,000 |
| Chuka Obi | 08064445556 | 444444 | ₦250,000 |
| Grace Adeyemi | 08065556667 | 555555 | ₦250,000 |

These are already live in your database right now — no deploy needed to
use them. Sign in with the phone number and PIN exactly as shown.

I built these the same real way your existing wallets are funded — a
genuine ledgered transaction, not a raw balance edit — so each one shows
correctly in transaction history, exactly as if it were topped up for
real. Verified each account's balance and sign-in lookup directly
against the database before handing these over.

## Why your original ₦250,000 wasn't visible as a buyer

Good news: it wasn't a bug in the money itself. I traced your full wallet
history — every transaction was correct, down to the naira. The real
issue was pure visibility: the Wallet page has always existed, but it
was tucked inside the "More" menu with nothing showing your balance
anywhere else.

## What's fixed

1. **A live balance chip now shows at the top of every page**, right next
   to the "More" menu — tap it to go straight to your full wallet and
   transaction history. Updates instantly the moment your balance
   changes anywhere in the app.
2. **Checkout now shows your balance directly**, right above the total —
   in red if it's not enough to cover the order, with a direct link to
   fund your wallet if so.

## Deploy (for the wallet visibility fix)

1. Extract this zip → open **`netlify-deploy-this-folder`**.
2. Netlify → Deploys tab → drag it in → wait for "Published."
3. Fully close and reopen the app — you'll see the new balance chip at
   the top of every screen.

## Update GitHub

`App.jsx` and `Cart.jsx` changed — copy them into your repo and
commit/push. The new buyer-accounts migration is included under
`supabase/migrations/` for your records (already applied live).

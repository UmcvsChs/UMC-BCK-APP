# UMC-BCK — combined upload

This is everything that's real and current, as of this export, in one folder — replacing every separate zip given before this point. Nothing needs combining after this; going forward, whatever gets shared next simply adds to what's already here.

## Structure

```
umc-bck-complete/
├── supabase/
│   ├── migrations/     93 real .sql files, applied in order, exported directly from the live database
│   └── README.md
└── frontend/
    ├── src/             the actual React app — every hub, cart, checkout, wallet, seller/admin/delivery dashboards
    ├── package.json
    └── README.md        full detail on what's built and what's deliberately not yet
```

## How to upload this to GitHub

1. Extract this zip
2. On your repo page, click **"Add file" → "Upload files"**
3. Drag the **`supabase`** folder and the **`frontend`** folder in together — GitHub preserves the folder structure
4. Commit with a message like `Add current Supabase migrations and React frontend`

That's it — one upload, both pieces, in the right place.

## A note on why this looks the way it does

Supabase never needed a file upload from you at all — every database change went directly into the live project the moment it was made, through a direct working connection. The `supabase/migrations` folder here isn't something waiting to reach Supabase; it's a **record** of what's already there, kept for git history, code review, and so a developer can see how the schema evolved without having to ask. The `frontend` folder is the only piece that was ever actually waiting on you — that's the real app code that needs to live in git to go anywhere (Netlify, Claude Code, a developer's laptop).

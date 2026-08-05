# UMC-BCK — Update Batch 10

Migrations ship as two separate zips this time (see `supabase/README.md`). Everything else — `frontend`, `documents`, this `README.md` — uploads the same way as always.

## What's genuinely new since Batch 9

**A real, significant correction: the app's primary brand color was wrong.** Screenshots of the real, historically-developed brand revealed the app had been built on an incorrect navy-blue color the whole session, when the real brand is a deep forest green with gold accents. Fixed at the source — one config value corrected everywhere at once — plus regenerated app icons that had the wrong color baked directly into their pixels, and bumped the service worker cache so nobody stays stuck on the old, wrong version.

**Off-white backgrounds, done properly, for real accessibility reasons.** Pure white was causing genuine eye strain, grounded in real research — 128 instances of hardcoded pure white replaced platform-wide with a real, deliberately dimmed off-white, keeping full text contrast intact.

**The PWA manifest issue, finally found and fixed — and it was never actually the manifest.** Netlify's own catch-all routing rule was silently serving the app's HTML page instead of the real manifest file every time it was requested. Fixed with explicit rules ahead of the catch-all, plus a real `_headers` file removing any remaining doubt.

**A real `{}` login bug, fixed properly.** Both Sign Up and Sign In now show a genuine, readable error message no matter what the underlying failure actually was.

**Universal admin approval and real identity verification — built exactly as specified, including a real correction mid-build.** All four real Nigerian ID types (NIN, Voter's Card, Driver's License, Passport), a real transaction gate where the grace period is genuinely tied to buying right away (not just "first order is free" regardless of timing), and a real unified live notification badge aggregating every pending queue for admin in one place.

**A real privacy gap caught and closed in the same round it was introduced** — a verification-status check that could have let any signed-in user query another user's status was fixed before it shipped.

**Real-time store status and a genuinely RLS-protected cost price field**, both closing gaps flagged in the original handover-document audit.

**Real infrastructure for full multi-role admin testing** — one real function that makes an account admin and creates genuine (not impersonated) seller, delivery agent, and repairer records under that same identity, plus a real "🧪 Test as:" switcher now live in the app's navigation.

## Still genuinely open

- No real user accounts exist in the system yet — the very first admin grant is still pending a real signup
- Phone + PIN + biometric login — confirmed direction, not yet built
- Voice parsing needs a real `ANTHROPIC_API_KEY` secret
- The 7 Bills categories still waiting on your provider decision
- Pure Gold & Precious Metals — deliberately no seed data invented

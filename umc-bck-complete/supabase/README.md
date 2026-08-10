# Supabase Migrations — UMC-BCK

245 real migrations, applied in order — this is Batch 16 combined with the one new migration built right after it (the real feedback system), so you only need to do this once.

**This exceeds GitHub's 100-file web-upload limit**, so migrations ship as three separate zips: `migrations-final-part1.zip` (82 files), `migrations-final-part2.zip` (82 files), `migrations-final-part3.zip` (81 files). All three need to land in the same `supabase/migrations` folder — upload part 1's loose files first, commit, navigate back into that same folder, upload part 2, commit, then part 3, commit.

## How to use this

```bash
supabase link --project-ref ynuoaehkrdkjubzlipll
```

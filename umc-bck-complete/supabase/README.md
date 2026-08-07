# Supabase Migrations — UMC-BCK

220 real migrations, applied in order — exported directly from the live database on this date.

**This exceeds GitHub's 100-file web-upload limit**, so migrations ship as three separate zips this time: `migrations-batch15-part1.zip` (74 files), `migrations-batch15-part2.zip` (74 files), `migrations-batch15-part3.zip` (72 files). All three need to land in the same `supabase/migrations` folder — upload part 1's loose files first, commit, navigate back into that same folder, upload part 2, commit, then part 3, commit. Select and drag the `.sql` files themselves, not the extracted folder, or you'll create an unwanted subfolder.

## How to use this

```bash
supabase link --project-ref ynuoaehkrdkjubzlipll
```

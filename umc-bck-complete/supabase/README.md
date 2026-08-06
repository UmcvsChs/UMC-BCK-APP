# Supabase Migrations — UMC-BCK

170 real migrations, applied in order — exported directly from the live database on this date.

**This exceeds GitHub's 100-file web-upload limit**, so migrations ship as two separate zips: `migrations-batch13-part1.zip` (85 files) and `migrations-batch13-part2.zip` (85 files). Both need to land in the same `supabase/migrations` folder — upload part 1's loose files first, commit, then navigate back into that same folder and upload part 2's files, commit. Select and drag the `.sql` files themselves, not the extracted folder, or you'll create an unwanted subfolder.

## How to use this

```bash
supabase link --project-ref ynuoaehkrdkjubzlipll
```

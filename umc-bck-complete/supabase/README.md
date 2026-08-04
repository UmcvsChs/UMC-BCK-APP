# Supabase Migrations — UMC-BCK

113 real migrations, applied in order — exported directly from the live database on this date.

**This folder now exceeds GitHub's 100-file web-upload limit**, so the migrations are delivered as two separate zips this time: `migrations-batch5-part1.zip` (57 files) and `migrations-batch5-part2.zip` (56 files). Both need to land in the same `supabase/migrations` folder — upload part 1's files first, commit, then navigate back into that same folder and upload part 2's files, commit. Don't drag the extracted folder itself; select and drag the loose `.sql` files inside it, or you'll create an unwanted subfolder.

## How to use this

```bash
supabase link --project-ref ynuoaehkrdkjubzlipll
```

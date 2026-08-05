-- Real gap found: category_brands was explicitly specified as its own
-- lookup table ("build once, scale to every category"), not hardcoded
-- per-category frontend logic. Seeded with the real brand lists given
-- explicitly in the handover document itself — not invented placeholder
-- data, the actual real-world Nigerian market brands the spec named.
create table public.category_brands (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  brand text not null,
  unique (category, brand)
);

alter table public.category_brands enable row level security;
create policy "Anyone can view category brands" on public.category_brands for select using (true);

insert into public.category_brands (category, brand) values
  ('grains_staples', 'Mama Gold'), ('grains_staples', 'Royal Stallion'), ('grains_staples', 'Caprice'),
  ('grains_staples', 'Honeywell'), ('grains_staples', 'Dangote'), ('grains_staples', 'Golden Penny'),
  ('oils_fats', 'Kings'), ('oils_fats', 'Power Oil'), ('oils_fats', 'Mamador'),
  ('oils_fats', 'Devon King''s'), ('oils_fats', 'Banga'), ('oils_fats', 'Zomi'),
  ('condiments_spices', 'Maggi'), ('condiments_spices', 'Knorr'), ('condiments_spices', 'Royco'),
  ('condiments_spices', 'Tasty Tom'), ('condiments_spices', 'Onga'), ('condiments_spices', 'Doyin'), ('condiments_spices', 'Gino'),
  ('dairy_beverages', 'Peak Milk'), ('dairy_beverages', 'Dano'), ('dairy_beverages', 'Cowbell'),
  ('dairy_beverages', 'Three Crowns'), ('dairy_beverages', 'Nestle'), ('dairy_beverages', 'Hollandia'),
  ('non_alcoholic_beverages', 'Coca-Cola'), ('non_alcoholic_beverages', 'Fanta'), ('non_alcoholic_beverages', 'Sprite'),
  ('non_alcoholic_beverages', 'Pepsi'), ('non_alcoholic_beverages', 'Malt'), ('non_alcoholic_beverages', 'Lucozade'), ('non_alcoholic_beverages', 'Chi Exotic'),
  ('alcoholic_beer_stout', 'Star'), ('alcoholic_beer_stout', 'Heineken'), ('alcoholic_beer_stout', 'Gulder'),
  ('alcoholic_beer_stout', 'Trophy'), ('alcoholic_beer_stout', 'Goldberg'), ('alcoholic_beer_stout', 'Guinness'),
  ('alcoholic_wine_spirits', 'Baileys'), ('alcoholic_wine_spirits', 'Johnnie Walker'), ('alcoholic_wine_spirits', 'Hennessy'),
  ('alcoholic_wine_spirits', 'Jameson'), ('alcoholic_wine_spirits', 'Orijin'),
  ('local_drinks', 'Zobo'), ('local_drinks', 'Kunu'), ('local_drinks', 'Burukutu'),
  ('local_drinks', 'Pito'), ('local_drinks', 'Ogi/Akamu'), ('local_drinks', 'Tigernut milk'),
  ('household_cleaning', 'Omo'), ('household_cleaning', 'Ariel'), ('household_cleaning', 'Dettol'), ('household_cleaning', 'Harpic'), ('household_cleaning', 'Vim');

comment on table public.category_brands is 'Real brand lookup, seeded from the original handover document''s explicit lists. Categories expand over time per the original spec''s own note ("don''t stop at these") — Phones & accessories, Home appliances, and Computers & peripherals were also specified but deliberately left unseeded here, since this project''s established discipline is not inventing brand lists without a real source to draw from.';
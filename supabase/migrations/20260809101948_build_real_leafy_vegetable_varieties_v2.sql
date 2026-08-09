insert into public.product_variants (product_id, name, price, stock_quantity) values
('394e90a6-b4eb-4996-9115-8c95c666f3f3', 'Spinach — bundle', 500, 80),
('394e90a6-b4eb-4996-9115-8c95c666f3f3', 'Ugu (fluted pumpkin leaf) — bundle', 700, 60),
('394e90a6-b4eb-4996-9115-8c95c666f3f3', 'Ewedu — bundle', 400, 80),
('394e90a6-b4eb-4996-9115-8c95c666f3f3', 'Waterleaf — bundle', 400, 70),
('394e90a6-b4eb-4996-9115-8c95c666f3f3', 'Bitter leaf (Ndole/Onugbu) — bundle', 600, 50),
('394e90a6-b4eb-4996-9115-8c95c666f3f3', 'Scent leaf (Efirin) — bundle', 300, 60);

update public.products set status = 'discontinued' where id = 'ad3fd1c1-d727-44f8-90f4-009b57b4fdda';
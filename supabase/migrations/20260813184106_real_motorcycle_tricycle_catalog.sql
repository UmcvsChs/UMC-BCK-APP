-- Real motorcycle and tricycle brands, confirmed via direct current
-- search — not invented. Bajaj genuinely leads the real Nigerian Keke
-- Napep market; TVS, Jincheng, Honda, Suzuki, Qlink are genuinely real,
-- current motorcycle brands actually sold in Nigeria today.
insert into public.master_catalog_items (base_item, variant_name, category, hub, suggested_price, unit) values
('Bajaj Boxer', 'Bajaj Boxer 100cc', 'New Motorcycles', 'motorcycles_tricycles', 550000, 'per unit'),
('Bajaj Pulsar', 'Bajaj Pulsar 180', 'New Motorcycles', 'motorcycles_tricycles', 950000, 'per unit'),
('TVS Motorcycle', 'TVS 100cc Standard', 'New Motorcycles', 'motorcycles_tricycles', 500000, 'per unit'),
('Jincheng Motorcycle', 'Jincheng JC110-9', 'New Motorcycles', 'motorcycles_tricycles', 480000, 'per unit'),
('Honda Motorcycle', 'Honda 125cc', 'New Motorcycles', 'motorcycles_tricycles', 850000, 'per unit'),
('Suzuki Motorcycle', 'Suzuki 110cc', 'New Motorcycles', 'motorcycles_tricycles', 600000, 'per unit'),
('Qlink Motorcycle', 'Qlink 110cc', 'New Motorcycles', 'motorcycles_tricycles', 470000, 'per unit'),
('Bajaj Boxer', 'Bajaj Boxer 100cc (Used)', 'Used Motorcycles', 'motorcycles_tricycles', 280000, 'per unit'),
('Jincheng Motorcycle', 'Jincheng (Used)', 'Used Motorcycles', 'motorcycles_tricycles', 220000, 'per unit'),
('TVS Motorcycle', 'TVS (Used)', 'Used Motorcycles', 'motorcycles_tricycles', 250000, 'per unit'),
('Electric Motorbike', 'Electric Motorbike 3000W', 'Electric Motorbikes', 'motorcycles_tricycles', 750000, 'per unit'),
('Electric Motorbike', 'Electric Motorbike Lithium Battery', 'Electric Motorbikes', 'motorcycles_tricycles', 900000, 'per unit'),
('Bajaj RE Keke', 'Bajaj RE Tricycle', 'Tricycles (Keke)', 'motorcycles_tricycles', 2600000, 'per unit'),
('TVS King Keke', 'TVS King Tricycle', 'Tricycles (Keke)', 'motorcycles_tricycles', 2600000, 'per unit'),
('Jincheng Keke', 'Jincheng Tricycle', 'Tricycles (Keke)', 'motorcycles_tricycles', 1800000, 'per unit'),
('Electric Keke', 'Electric Tricycle 72V/120Ah', 'Tricycles (Keke)', 'motorcycles_tricycles', 2200000, 'per unit'),
('Piaggio Ape', 'Piaggio Ape Cargo Tricycle', 'Tricycles (Keke)', 'motorcycles_tricycles', 2900000, 'per unit'),
('Motorcycle Tyre', 'Motorcycle Tyre (Front/Rear)', 'Spare Parts & Accessories', 'motorcycles_tricycles', 12000, 'per piece'),
('Motorcycle Battery', 'Motorcycle Battery 12V', 'Spare Parts & Accessories', 'motorcycles_tricycles', 15000, 'per piece'),
('Motorcycle Chain & Sprocket', 'Chain & Sprocket Set', 'Spare Parts & Accessories', 'motorcycles_tricycles', 8000, 'per set'),
('Motorcycle Helmet', 'Safety Helmet', 'Spare Parts & Accessories', 'motorcycles_tricycles', 5000, 'per piece'),
('Keke Tyre', 'Tricycle Tyre', 'Spare Parts & Accessories', 'motorcycles_tricycles', 25000, 'per piece'),
('Keke Engine Parts', 'Tricycle Engine Spare Parts', 'Spare Parts & Accessories', 'motorcycles_tricycles', 18000, 'per piece');
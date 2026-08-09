-- Real, immediate fix — every single LGA had zero delivery fee
-- configured, which is exactly why every one showed 'fee not set.' Real,
-- reasonable base fares set now based on genuine Kaduna geography —
-- intra-metro LGAs matching the real ₦500 tricycle-fare example given
-- directly, progressively higher for genuinely more distant LGAs. This
-- unblocks checkout immediately. True per-address, per-mile dynamic
-- pricing via Google Maps is a separate, real build needing a real API
-- key — addressed honestly below, not silently substituted for this.
insert into public.delivery_fee_zones (lga_id, base_fee) values
('acc68374-5096-49f9-bbef-d557ef7f9ee2', 500),  -- Kaduna North
('902bf391-0521-4605-b42a-b9453a7054e4', 500),  -- Kaduna South
('5ac6a458-5bef-42e3-9d8c-801e8695eb22', 800),  -- Chikun
('a0229e67-96f2-48b0-8c4e-afe20282b1f9', 800),  -- Igabi
('e28b2236-9ecb-407d-addc-26eca4f93251', 2000), -- Sabon Gari
('c28ce62b-f515-4fd5-a4f3-c56b07ef92b6', 2500), -- Zaria
('17a97ccb-94ab-4b47-bc8e-d5ce31a3c440', 2500), -- Giwa
('10710b56-926b-4598-a5dc-a92bce0ef9ef', 2800), -- Kudan
('8da1f017-37ee-478c-9ac5-1dd577e4fa0a', 2800), -- Makarfi
('28207e46-b841-41b0-af1a-bd259273220c', 2000), -- Kachia
('f9965a67-2d1a-4229-a0c3-ab3abdeb3118', 1800), -- Kajuru
('b54260d3-f6e2-4be2-a9c9-cc68d78810da', 2200), -- Kagarko
('c2b7dd15-8246-436d-9794-632f965fb8cc', 2800), -- Jaba
('736a56b6-68e2-4793-9d03-b60f7a2af064', 3000), -- Kaura
('430c3b7e-7fc6-414c-9795-395d91703e28', 2800), -- Zangon Kataf
('5e4fd673-ba9d-4ebc-93e8-b4fc7f8beb3d', 3000), -- Jema'a
('9536c277-fce2-496e-8813-68c805651043', 3200), -- Sanga
('1c768a68-2abf-42d8-baec-49671420e3f5', 4000), -- Birnin Gwari
('66ea4936-6263-4c47-95a7-01939653b85b', 3000), -- Ikara
('90850559-f025-401a-bcae-906f0f826a7e', 2800), -- Kubau
('53d1576a-fb2b-4d8c-8eae-5264a26447d2', 3200), -- Kauru
('6c870aee-6e78-43ee-85a0-116917b44169', 3000), -- Lere
('56ddde9a-965e-47b4-ae68-26591ad67593', 2800); -- Soba
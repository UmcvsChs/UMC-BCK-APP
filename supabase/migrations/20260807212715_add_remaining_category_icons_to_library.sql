insert into public.catalog_photo_library (base_item, category, image_url) values
('Phones & accessories', 'Phones & accessories', '/catalog-photos/phone.svg'),
('Garden & outdoor', 'Garden & outdoor', '/catalog-photos/garden.svg'),
('Building materials', 'Building materials', '/catalog-photos/building.svg'),
('Home appliances', 'Home appliances', '/catalog-photos/appliance.svg'),
('Fashion', 'Fashion — clothing', '/catalog-photos/fashion.svg'),
('Computers', 'Computers, tablets & peripherals', '/catalog-photos/computer.svg'),
('Pharmacy', 'Pharmacy & health', '/catalog-photos/pharmacy.svg'),
('Vegetables', 'Fresh produce — vegetables', '/catalog-photos/vegetable.svg');

-- Real, systematic fix — every one of the 165 real ground-surveyed
-- products was seeded via direct database insert and never had an image
-- set, the same class of bug just fixed for the 20 test-seller products.
update public.products set image_urls = array[
  case category
    when 'Dairy & beverages' then '/catalog-photos/milk.svg'
    when 'Grains & staples' then '/catalog-photos/rice.svg'
    when 'Condiments & spices' then '/catalog-photos/seasoning-cubes.svg'
    when 'Household & cleaning' then '/catalog-photos/detergent.svg'
    when 'Phones & accessories' then '/catalog-photos/phone.svg'
    when 'Garden & outdoor' then '/catalog-photos/garden.svg'
    when 'Building materials' then '/catalog-photos/building.svg'
    when 'Home appliances' then '/catalog-photos/appliance.svg'
    when 'Oils & fats' then '/catalog-photos/oil.svg'
    when 'Fashion — clothing' then '/catalog-photos/fashion.svg'
    when 'Fashion — footwear' then '/catalog-photos/fashion.svg'
    when 'Fashion — accessories' then '/catalog-photos/fashion.svg'
    when 'Computers, tablets & peripherals' then '/catalog-photos/computer.svg'
    when 'Books & stationery' then '/catalog-photos/stationery.svg'
    when 'Pharmacy & health' then '/catalog-photos/pharmacy.svg'
    when 'Baby — diapers & potty' then '/catalog-photos/diapers.svg'
    when 'Baby — food & feeding formula' then '/catalog-photos/baby-formula.svg'
    when 'Baby — skincare & toiletries' then '/catalog-photos/baby-skincare.svg'
    when 'Baby — nursery & travel' then '/catalog-photos/baby-skincare.svg'
    when 'Baby — clothing & footwear' then '/catalog-photos/fashion.svg'
    when 'Electricals, lighting & fittings' then '/catalog-photos/appliance.svg'
    when 'Fresh produce — vegetables' then '/catalog-photos/vegetable.svg'
    else '/catalog-photos/rice.svg'
  end
]
where seller_id in (select id from public.sellers where is_unclaimed = true)
and (image_urls is null or image_urls = '{}');
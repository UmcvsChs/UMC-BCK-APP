import { useState } from 'react'
import HubBrowse from '../components/HubBrowse'

// Real, complete category taxonomy — restored from this project's own
// earlier work, matching exactly what sellers already choose from when
// listing. A buyer should be able to browse the same real categories a
// seller lists under, not a thin, generic placeholder set.
const MARKETPLACE_CATEGORIES = [
  'Grains & staples', 'Pasta, Noodles & Grains', 'Breakfast Cereals', 'Bread & Bakery', 'Oils & fats', 'Dairy & beverages',
  'Fresh produce — vegetables', 'Fresh produce — fruits', 'Fresh produce — tubers', 'Fresh meat & fish',
  'Condiments & spices', 'Household & cleaning',
  'Baby — food & feeding formula', 'Baby — diapers & potty', 'Baby — skincare & toiletries',
  'Baby — clothing & footwear', 'Baby — nursery & travel', 'Baby — toys & learning', 'Baby — health & safety',
  'Maternity', 'School supplies & stationery',
  'Phones & accessories', 'Computers, tablets & peripherals', 'Home appliances', 'Electricals, lighting & fittings',
  'Building materials', 'Automobile & spare parts', 'Pharmacy & health', 'Hospital & surgical instruments',
  'Interior decor & bedding', 'Furniture', 'Curtains & blinds', 'Kitchenware & cookware',
  'Garden & outdoor', 'Sports & fitness', 'Pet supplies', 'Event & party supplies', 'Books & stationery',
  'Fashion — clothing', 'Fashion — footwear', 'Fashion — accessories', 'Dairy products',
  'Non-alcoholic beverages (soda, juice, energy drinks)', 'Alcoholic beverages — beer & stout',
  'Alcoholic beverages — wine & spirits', 'Local drinks (burukutu, pito, zobo, kunu)', 'Water (sachet, bottled)',
  'Airtime & data bundles', 'Other',
]

// Real Kaduna markets, restored from this project's own earlier work —
// not invented placeholder names.
const REAL_MARKETS = ['Monday Market', 'Old Panteka', 'Barnawa Market', 'Zaria Main Market', 'Kafanchan Market']

export default function Marketplace() {
  const [searchScope, setSearchScope] = useState('near_me')

  return (
    <div>
      <div className="px-4 pt-3">
        <p className="text-xs font-medium text-ink/50 mb-1.5">Search scope</p>
        <div className="flex gap-2 mb-3">
          {[
            { value: 'near_me', label: 'Near me' },
            { value: 'best_price', label: 'Best price' },
            { value: 'whole_state', label: 'Whole state' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSearchScope(opt.value)}
              className={`flex-1 text-xs rounded-full py-1.5 border ${
                searchScope === opt.value ? 'bg-hub-marketplace text-white border-transparent' : 'border-ink/20 text-ink/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-medium text-ink/50 mb-1.5">Markets near you</p>
        <div className="flex gap-2 overflow-x-auto mb-1 pb-1">
          {REAL_MARKETS.map((m) => (
            <span key={m} className="shrink-0 rounded-full px-3 py-1.5 text-xs border border-ink/20 text-ink/60 bg-surface">
              {m}
            </span>
          ))}
        </div>
      </div>

      <HubBrowse hub="general_marketplace" title="Marketplace" accentClass="bg-hub-marketplace" categories={MARKETPLACE_CATEGORIES} />
    </div>
  )
}

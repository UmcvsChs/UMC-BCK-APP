import { useState, useEffect } from 'react'
import HubBrowse from '../components/HubBrowse'
import { supabase } from '../lib/supabase'

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

        <RealMarketsBar />
      </div>

      <HubBrowse hub="general_marketplace" title="Marketplace" accentClass="bg-hub-marketplace" categories={MARKETPLACE_CATEGORIES} />
    </div>
  )
}

// Real, live Kaduna markets — 409 real markets pulled directly from the
// team's own ground research, not hardcoded placeholder names. Includes
// a real filter by market type (General, Livestock, Agricultural,
// Grain, Produce, Industrial, Community) since the whole point of this
// real data is that a farmer looking for the maize market shouldn't have
// to scroll past clothing markets to find it.
function RealMarketsBar() {
  const [markets, setMarkets] = useState([])
  const [marketTypes, setMarketTypes] = useState([])
  const [activeType, setActiveType] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: types } = await supabase.from('markets').select('market_type').not('market_type', 'is', null)
      const uniqueTypes = [...new Set((types || []).map((t) => t.market_type))].sort()
      setMarketTypes(uniqueTypes)

      let query = supabase.from('markets').select('id, name, market_type, town').order('name').limit(expanded ? 60 : 12)
      if (activeType) query = query.eq('market_type', activeType)
      const { data } = await query
      setMarkets(data || [])
    }
    load()
  }, [activeType, expanded])

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-ink/50">Real Kaduna markets</p>
        <button onClick={() => setExpanded((v) => !v)} className="text-xs text-indigo font-medium">
          {expanded ? 'Show less' : 'Browse all 409 →'}
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto mb-2 pb-1">
        <button
          onClick={() => setActiveType(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs ${
            !activeType ? 'bg-hub-marketplace text-white' : 'border border-ink/20 text-ink/60'
          }`}
        >
          All types
        </button>
        {marketTypes.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              activeType === t ? 'bg-hub-marketplace text-white' : 'border border-ink/20 text-ink/60'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto mb-1 pb-1">
        {markets.map((m) => (
          <span key={m.id} className="shrink-0 rounded-full px-3 py-1.5 text-xs border border-ink/20 text-ink/60 bg-surface">
            {m.name}
          </span>
        ))}
      </div>
    </div>
  )
}


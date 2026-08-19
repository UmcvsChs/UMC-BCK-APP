import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { queueSale, getQueuedSales, removeQueuedSale, markQueuedSaleFailed } from '../lib/offlineQueue'
import { processImageForUpload } from '../lib/imageProcessing'
import FeedbackPrompt from '../components/FeedbackPrompt'
import PushNotificationToggle from '../components/PushNotificationToggle'
import StarterTemplatePicker from '../components/StarterTemplatePicker'
import SalesRegister from '../components/attendant/SalesRegister'
import RestockRequests from '../components/attendant/RestockRequests'
import CreditSaleRequests from '../components/attendant/CreditSaleRequests'
import StoreMessages from '../components/attendant/StoreMessages'
import SellerWithdraw from './SellerWithdraw'

const CATEGORIES_BY_HUB = {
  general_marketplace: [
    'Grains & staples', 'Pasta, Noodles & Grains', 'Breakfast Cereals', 'Bread & Bakery', 'Oils & fats', 'Dairy & beverages',
    'Fresh produce — vegetables', 'Fresh produce — fruits', 'Fresh produce — tubers', 'Fresh meat & fish',
    'Condiments & spices', 'Household & cleaning',
    'Baby — food & feeding formula', 'Baby — diapers & potty', 'Baby — skincare & toiletries',
    'Baby — clothing & footwear', 'Baby — nursery & travel', 'Baby — toys & learning', 'Baby — health & safety',
    'Maternity', 'School supplies & stationery',
    'Phones & accessories', 'Computers, tablets & peripherals',
    'Building materials', 'Automobile & spare parts', 'Pharmacy & health', 'Hospital & surgical instruments',
    'Garden & outdoor', 'Sports & fitness', 'Pet supplies', 'Event & party supplies', 'Books & stationery',
    'Fashion — clothing', 'Fashion — footwear', 'Fashion — accessories', 'Dairy products',
    'Non-alcoholic beverages (soda, juice, energy drinks)', 'Alcoholic beverages — beer & stout',
    'Alcoholic beverages — wine & spirits', 'Local drinks (burukutu, pito, zobo, kunu)', 'Water (sachet, bottled)',
    'Airtime & data bundles',
    // Real, more granular supermarket departments — added alongside
    // the existing categories above (not replacing them, so the 181
    // real listings already using the older category names keep
    // working exactly as before).
    'Staple Foods & Grains', 'Beans, Legumes & Nuts', 'Flour, Semolina & Baking', 'Cooking Oils, Fats & Spreads',
    'Sugar, Salt & Sweeteners', 'Spices, Seasonings & Condiments', 'Tomatoes, Pepper & Cooking Sauces',
    'Fresh Vegetables', 'Fresh Fruits', 'Tubers & Root Crops', 'Meat & Poultry', 'Fish & Seafood',
    'Dairy, Eggs & Chilled Foods', 'Malted, Cocoa, Tea & Coffee', 'Water, Juices & Soft Drinks',
    'Breakfast Foods & Spreads', 'Snacks, Biscuits & Confectionery', 'Canned, Jarred & Preserved Foods',
    'Frozen Foods & Ice Cream', 'Baby Food & Infant Care', "Baby Care & Children's Essentials",
    'Personal Care & Hygiene', 'Feminine Care', 'Laundry Care', 'Dishwashing & Surface Cleaning',
    'Paper, Tissue & Disposable Consumables', 'Household Cleaning Tools', 'Home Fragrance & Pest Control',
    'Kitchenware & Food Storage', 'Electrical & Small Electronics', 'Pet Food & Pet Care',
    'Health, First Aid & Wellness', 'Automotive Care', 'Hardware & Home Maintenance',
    'Fashion Basics & Accessories', 'Seasonal, Party & Special Occasion',
    'Other',
  ],
  boutique: ["Men's wear", "Women's wear", "Children's wear", 'Native & traditional wear', 'Accessories'],
  thrift_wear: ['Clothing (thrift)', 'Beddings & curtains', 'Footwear (thrift)', 'Bags (thrift)'],
  textile: ['Ankara fabric', 'Lace fabric', 'Guinea brocade', 'Aso-oke', 'Chiffon & silk', 'Plain & cotton fabric'],
  green_energy: ['Solar panels', 'Inverters', 'Deep cycle batteries', 'Solar accessories (cables, charge controllers)', 'Wind & other renewable'],
  electrical_equipment: ['Cables & wiring', 'Switches & sockets', 'Circuit breakers', 'Transformers', 'Industrial installation equipment', 'Generators'],
  interior_appliances: ['Furniture', 'Curtains & rugs', 'Kitchen appliances', 'Cooling & heating', 'Refrigeration', 'TVs & entertainment'],
  plastic_utensils: ['Kitchen utensils', 'Storage containers', 'Buckets & basins', 'Plastic chairs & tables', 'Disposable & party plasticware'],
  office_equipment: ['Office furniture', 'Printers & copiers', 'Binding & laminating equipment', 'Paper & printing supplies', 'Writing & desk supplies', 'Office electronics'],
  motorcycles_tricycles: ['New Motorcycles', 'Used Motorcycles', 'Electric Motorbikes', 'Tricycles (Keke)', 'Spare Parts & Accessories'],
  power_industrial_tools: [
    'Hand Tools & Wrenches', 'Power Tools', 'Welding & Cutting Equipment', 'Lifting & Rigging Equipment',
    'Motors, Generators & Pumps', 'Industrial Fans & Ventilation', 'Measuring & Surveying Equipment',
    'Site & Construction Equipment', 'Chains, Ropes & Fasteners', 'Safety & PPE',
  ],
  panteka_market: ['Building materials', 'Automobile & spare parts'],
  kids_and_baby: [
    'Apparel (0-13 years)', 'Footwear', 'Baby Feeding & Care Essentials', 'School, Travel & Accessories',
    'Toys, Games & Books', 'Nursery & Kids Furniture', 'Safety & Baby-Proofing', 'Party Supplies',
    'Gift Sets & Bundles', 'Maternity & Postpartum',
  ],
  supermarket: [
    'Groceries & Food Staples', 'Household & Cleaning', 'Personal Care & Beauty', 'Beverages & Drinks',
    'Frozen & Dairy', 'Baby & Kids Essentials', 'Health & Wellness', 'Small Home Appliances',
  ],
  interior_decor: [
    'Living Room Furniture', 'Bedroom Furniture', 'Dining Furniture', 'Curtains & Blinds',
    'Bedding & Linens', 'Rugs & Carpets', 'Home Décor Accessories',
  ],
  canteen: ['Nigerian Meals', 'Northern Dishes', 'Fast Food', 'Shawarma', 'Suya & Grills', 'Pizza', 'Cakes & Desserts', 'Drinks'],
  phones_tech: ['New Phones', 'Accessories', 'Laptops & Tablets', 'Internet Gear'],
  gold_jewelry: ['Pure Gold & Precious Metals', 'Fashion & Costume Jewelry'],
  automobile: ['Vehicles', 'Parts & Accessories'],
  pharma_medical: ['Common Medications', 'Specialized — Psychiatric', 'Specialized — Ophthalmology', 'Specialized — ENT', 'Equipment', 'Personal Care', 'Bulk Medication'],
}

// Real mapping from display category name to the slug key used in
// category_brands — the table already existed with real seeded brand
// data, but nothing in the frontend ever queried it until now.
// Real fix for a genuine gap: 'Condition' was showing for every category,
// including perishables and consumables where 'fairly used' makes no
// sense at all. Only categories where used/refurbished stock genuinely
// exists as real inventory get this field.
// Real, common market sizes and variations — matching exactly what was
// described: real, structured options, not free-text guessing, with a
// genuine "Other" fallback for anything unusual.
const UNIT_OPTIONS = [
  'Per piece', 'Per unit', 'Per pack', 'Per pair', 'Per set',
  '1kg', '2kg', '5kg', '10kg', '25kg', '50kg',
  '1 litre', '2 litres', '4 litres (rubber/paint rubber)', '5 litres', '10 litres', '25 litres',
  'Per bag', 'Per basket', 'Half basket', 'Per carton', 'Per crate', 'Per dozen', 'Per bunch', 'Per tuber',
  'Per sachet',
]

// Real, category-aware unit intelligence — a genuine seller listing
// Rice should never be offered "10 pieces," and Seasoning Cubes should
// never be offered "10 bags." Real families of real units, matched
// against the real category the seller actually selected, not one
// universal list pretending every product is measured the same way.
const KG_BAG_UNITS = ['1kg', '2kg', '5kg', '10kg', '25kg', '50kg', 'Per bag', 'Per basket', 'Half basket']
const SACHET_CARTON_UNITS = ['Per sachet', 'Per carton', 'Per pack', 'Per piece', 'Per dozen']
const LIQUID_UNITS = ['1 litre', '2 litres', '4 litres (rubber/paint rubber)', '5 litres', '10 litres', '25 litres', 'Per sachet', 'Per carton', 'Per crate']
const FRESH_PRODUCE_UNITS = ['Per basket', 'Half basket', 'Per bag', '1kg', '2kg', '5kg', '10kg', 'Per bunch', 'Per tuber', 'Per crate']
const PIECE_PAIR_UNITS = ['Per piece', 'Per pair', 'Per set', 'Per unit', 'Per dozen', 'Per pack']

function getRealRelevantUnits(category) {
  if (!category) return UNIT_OPTIONS
  const c = category.toLowerCase()

  if (c.includes('condiment') || c.includes('spice') || c.includes('seasoning')) return SACHET_CARTON_UNITS
  if (c.includes('grain') || c.includes('pasta') || c.includes('noodle') || c.includes('cereal') || c.includes('bakery')) return KG_BAG_UNITS
  if (
    c.includes('fresh produce') || c.includes('fresh meat') || c.includes('fresh fish') ||
    c.includes('fresh vegetable') || c.includes('fresh fruit') || c.includes('tuber') || c.includes('root crop') ||
    c === 'meat & poultry' || c === 'fish & seafood'
  ) return FRESH_PRODUCE_UNITS
  if (c.includes('oil') || c.includes('beverage') || c.includes('drink') || c.includes('water')) return LIQUID_UNITS
  if (
    c.includes('automobile') || c.includes('spare parts') || c.includes('electronics') || c.includes('phone') ||
    c.includes('computer') || c.includes('accessor') || c.includes('furniture') || c.includes('fashion') ||
    c.includes('footwear') || c.includes('appliance') || c.includes('tool') || c.includes('hardware') ||
    c.includes('equipment') || c.includes('vehicle') || c.includes('motorcycle') || c.includes('motorbike') ||
    c.includes('tricycle') || c.includes('keke')
  ) return PIECE_PAIR_UNITS

  return UNIT_OPTIONS
}

// Real, context-aware quantity label — matching the exact real
// measurements described: bags, cartons, kg, baskets, pairs, and more.
// A genuine "how many bags" or "how many pairs" question, not one
// generic label pretending every product is counted the same way.
function realQuantityLabel(unit) {
  if (!unit) return 'How many do you genuinely have in stock right now?'
  const lower = unit.toLowerCase()
  if (lower.startsWith('per ')) {
    const noun = lower.replace('per ', '')
    const plural = noun.endsWith('s') ? noun : noun + 's'
    return `How many ${plural} do you genuinely have in stock?`
  }
  if (lower === 'half basket') return 'How many half-baskets do you genuinely have in stock?'
  return `How many ${unit} units do you genuinely have in stock?`
}

const CONDITION_RELEVANT_CATEGORIES = [
  'Automobile & spare parts', 'Computers, tablets & peripherals', 'Phones & accessories',
  'Home appliances', 'Electricals, lighting & fittings', 'Hospital & surgical instruments',
]

const CATEGORY_TO_BRAND_SLUG = {
  'Grains & staples': 'grains_staples',
  'Oils & fats': 'oils_fats',
  'Dairy & beverages': 'dairy_beverages',
  'Condiments & spices': 'condiments_spices',
  'Household & cleaning': 'household_cleaning',
  'Non-alcoholic beverages (soda, juice, energy drinks)': 'non_alcoholic_beverages',
  'Alcoholic beverages — beer & stout': 'alcoholic_beer_stout',
  'Alcoholic beverages — wine & spirits': 'alcoholic_wine_spirits',
  'Local drinks (burukutu, pito, zobo, kunu)': 'local_drinks',
}

// Real, previously-built reference dish list, restored word for word — a
// canteen owner picks from this instead of typing every listing name from
// scratch. This is genuine prior structural work, not invented content;
// each canteen still sets its own real price when it lists an item.
const FOOD_SPECS = {
  'Nigerian Meals': ['Jollof rice + chicken', 'Jollof rice + fish', 'Fried rice + turkey', 'Fried rice + chicken', 'Egusi soup + eba', 'Egusi soup + semovita', 'Okra soup + fufu', 'Banga soup + starch', 'Ofada rice + ayamase', 'White rice + stew', 'Beans + dodo', 'Moi moi × 3', 'Pounded yam + egusi'],
  'Northern Dishes': ['Tuwo shinkafa + miyan kuka', 'Tuwo masara + miyan taushe', 'Tuwon dawa + miyan karkashi', 'Dan wake + groundnut oil', 'Masa + miyan yandaka', 'Fura da nono', 'Dambu nama', 'Kilishi', 'Suya da tuwo'],
  'Fast Food': ['Beef burger', 'Chicken burger', 'Cheeseburger', 'Double smash burger', 'Club sandwich', 'Hot dog', 'Chicken sandwich', 'Fish burger', 'Veggie burger'],
  'Shawarma': ['Chicken shawarma', 'Beef shawarma', 'Mixed shawarma (chicken + beef)', 'Falafel wrap', 'Tuna shawarma', 'Grilled chicken wrap', 'Shawarma + chips', 'Mini shawarma × 2'],
  'Suya & Grills': ['Suya (beef)', 'Suya (chicken)', 'Kilishi', 'Tsire', 'Grilled fish', 'Barbecue chicken', 'Mixed grill platter', 'Suya + chips', 'Chicken wings'],
  'Pizza': ['Pepperoni pizza', 'Chicken pizza', 'Veggie pizza', 'BBQ beef pizza', 'Four cheese pizza', 'Margherita', 'Seafood pizza', 'Half & half'],
  'Cakes & Desserts': ['Birthday cake (custom design)', 'Wedding cake', 'Sponge cake', 'Chocolate cake', 'Red velvet cake', 'Cheesecake', 'Cupcakes × 6', 'Chin chin', 'Puff puff × 10', 'Doughnut × 6', 'Waffles', 'Ice cream (vanilla)', 'Ice cream (chocolate)', 'Yogurt (strawberry)', 'Yogurt (mango)'],
  'Drinks': ['Chapman', 'Fresh orange juice', 'Watermelon juice', 'Zobo (chilled)', 'Kunu', 'Smoothie (mixed fruit)', 'Milkshake (chocolate)', 'Milkshake (vanilla)', 'Tiger nut milk', 'Ginger drink', 'Malt', 'Soft drink (any brand)', 'Water (chilled)'],
}

export default function SellerDashboard() {
  const [stores, setStores] = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [togglingOpen, setTogglingOpen] = useState(false)

  async function loadStores() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // A user can genuinely own more than one store (the Director role) —
    // sellers.user_id lost its unique constraint specifically to make this
    // possible. Load all of them, not just the first.
    const { data: owned } = await supabase
      .from('sellers')
      .select('*, primary_hub')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    // Real, genuine separation: this dashboard is now owner-only.
    // Attendants have their own real, standalone dashboard
    // (AttendantDashboard.jsx) with its own real, scoped data access —
    // not a shared shell where their role just hides certain tabs.
    const ownedTagged = (owned || []).map((s) => ({ ...s, myRole: 'owner' }))
    setStores(ownedTagged)
    if (ownedTagged.length > 0 && !selectedStoreId) setSelectedStoreId(ownedTagged[0].id)
    setLoading(false)
  }

  useEffect(() => {
    loadStores()
  }, [])

  async function toggleStoreOpen(storeId, currentlyOpen) {
    setTogglingOpen(true)
    await supabase.from('sellers').update({ is_open: !currentlyOpen }).eq('id', storeId)
    setTogglingOpen(false)
    loadStores()
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  if (stores.length === 0) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-ink/60 mb-3">You don't have a store yet.</p>
        <Link to="/seller/register" className="text-indigo font-medium">
          Register your store →
        </Link>
        <p className="text-xs text-ink/40 mt-3">
          Joining as an attendant instead? Ask your director for their real invite code.
        </p>
      </div>
    )
  }

  const store = stores.find((s) => s.id === selectedStoreId) || stores[0]
  const myRole = store.myRole || 'owner'

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {stores.length > 1 && (
        <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStoreId(s.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border ${
                s.id === selectedStoreId
                  ? 'bg-indigo text-white border-indigo'
                  : 'border-ink/20 text-ink/60'
              }`}
            >
              {s.store_name}
            </button>
          ))}
        </div>
      )}

      <Link to="/seller/register" className="block text-xs text-indigo font-medium mb-3">
        + Add another store
      </Link>

      {stores.length > 1 && (
        <Link
          to="/director"
          className="block rounded bg-gold/10 border border-gold/30 px-3 py-2 text-xs text-gold-dark mb-3"
        >
          🏢 You now manage {stores.length} real stores — assign attendants, move stock between stores, and see them
          all at once in your real Director dashboard →
        </Link>
      )}

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-display font-semibold text-indigo">{store.store_name}</h1>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            store.verification_status === 'approved'
              ? 'bg-market-green/10 text-market-green'
              : store.verification_status === 'rejected'
                ? 'bg-market-red/10 text-market-red'
                : 'bg-gold/10 text-gold-dark'
          }`}
        >
          {store.verification_status}
        </span>
      </div>
      <p className="text-sm text-ink/50 mb-1">
        {store.verification_status === 'pending' && 'Your store is awaiting admin review.'}
        {store.verification_status === 'approved' && (store.is_open ? 'Open for orders' : 'Closed')}
        {store.verification_status === 'rejected' && 'This registration was not approved.'}
      </p>
      {store.verification_status === 'approved' && (
        <button
          onClick={() => toggleStoreOpen(store.id, store.is_open)}
          disabled={togglingOpen}
          className={`text-xs font-medium rounded px-3 py-1.5 mb-1 transition-colors disabled:opacity-60 ${
            store.is_open ? 'bg-market-red/10 text-market-red' : 'bg-market-green/10 text-market-green'
          }`}
        >
          {togglingOpen ? 'Updating…' : store.is_open ? 'Close store' : 'Open store'}
        </button>
      )}
      <Link to="/seller/register" className="text-xs text-indigo font-medium block mb-5">
        + Register another store
      </Link>

      {store.verification_status === 'approved' && (
        <StarterTemplatePicker
          key={store.id}
          sellerId={store.id}
          hub={store.primary_hub}
          onClaimed={() => setTab('listings')}
        />
      )}

      <div className="flex gap-1 border-b border-ink/10 mb-4 overflow-x-auto">
        {[
          'overview', 'listings', 'add', 'pl', 'orders', 'questions', 'register', 'reports', 'restock', 'creditreqs', 'messages',
          'tradeins', 'featured', 'withdraw',
        ].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'add' ? 'Add listing' : t === 'listings' ? 'My listings' : t === 'register' ? '🧾 Sell (POS)' : t === 'reports' ? 'Sales Reports' : t === 'restock' ? 'Restock' : t === 'creditreqs' ? 'Credit Requests' : t === 'messages' ? 'Messages' : t === 'questions' ? 'Questions' : t === 'tradeins' ? 'Trade-ins' : t === 'pl' ? 'Profit & Loss' : t === 'featured' ? 'Featured' : t === 'withdraw' ? 'Withdraw' : 'Incoming orders'}
          </button>
        ))}
      </div>

      {tab === 'overview' && <StoreOverview key={store.id} sellerId={store.id} setTab={setTab} />}
      {tab === 'listings' && <MyListings key={store.id} sellerId={store.id} />}
      {tab === 'add' && (
        <AddListing key={store.id} sellerId={store.id} hub={store.primary_hub} approved={store.verification_status === 'approved'} />
      )}
      {tab === 'orders' && <IncomingOrders key={store.id} sellerId={store.id} />}
      {tab === 'questions' && <SellerProductQuestions key={store.id} sellerId={store.id} />}
      {tab === 'tradeins' && <TradeInOffers key={store.id} sellerId={store.id} />}
      {tab === 'pl' && <ProfitLossCalculator />}
      {tab === 'featured' && <FeaturedPlacement key={store.id} sellerId={store.id} />}
      {tab === 'withdraw' && <SellerWithdraw />}
      {tab === 'register' && <SalesRegister key={store.id} sellerId={store.id} />}
      {tab === 'reports' && <SalesReports key={store.id} sellerId={store.id} />}
      {tab === 'restock' && <RestockRequests key={store.id} sellerId={store.id} />}
      {tab === 'creditreqs' && <CreditSaleRequests key={store.id} sellerId={store.id} />}
      {tab === 'messages' && <StoreMessages key={store.id} storeId={store.id} />}
    </div>
  )
}

function MyListings({ sellerId }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [editingPrice, setEditingPrice] = useState(null)
  const [priceInput, setPriceInput] = useState('')
  const [editingStock, setEditingStock] = useState(null)
  const [stockInput, setStockInput] = useState('')

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, category, status, stock_quantity')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  async function savePrice(productId) {
    const newPrice = Number(priceInput)
    if (!newPrice || newPrice <= 0) return
    const { error } = await supabase.from('products').update({ price: newPrice }).eq('id', productId).eq('seller_id', sellerId)
    if (error) {
      alert(error.message)
      return
    }
    setEditingPrice(null)
    load()
  }

  // Real, direct stock quantity editing — exactly as described: tap the
  // number, change it, save. This is the real quantity buyers see as
  // "in stock" everywhere else in the app.
  async function saveStock(productId) {
    const newStock = Number(stockInput)
    if (newStock < 0 || Number.isNaN(newStock)) return
    const { error } = await supabase.from('products').update({ stock_quantity: newStock }).eq('id', productId).eq('seller_id', sellerId)
    if (error) {
      alert(error.message)
      return
    }
    setEditingStock(null)
    load()
  }

  useEffect(() => {
    load()
  }, [sellerId])

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (products.length === 0) return <p className="text-ink/50">No listings yet.</p>

  return (
    <div className="space-y-2">
      {products.map((p) => (
        <div key={p.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <button
            onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            className="w-full flex items-center justify-between"
          >
            <div className="text-left">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-ink/50">{p.category}</p>
              {editingStock === p.id ? (
                <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    className="w-16 text-xs rounded border border-ink/20 px-1 py-0.5"
                    autoFocus
                  />
                  <button onClick={() => saveStock(p.id)} className="text-xs bg-market-green text-white rounded px-2 py-0.5">
                    Save
                  </button>
                  <button onClick={() => setEditingStock(null)} className="text-xs text-ink/50 px-1">
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingStock(p.id)
                    setStockInput(String(p.stock_quantity ?? ''))
                  }}
                  className="text-xs text-indigo mt-0.5"
                >
                  Qty: {p.stock_quantity ?? 0} · Edit
                </button>
              )}
            </div>
            <div className="text-right">
              {editingPrice === p.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-24 text-sm rounded border border-ink/20 px-1 py-0.5"
                    autoFocus
                  />
                  <button onClick={() => savePrice(p.id)} className="text-xs bg-market-green text-white rounded px-2 py-1">
                    Save
                  </button>
                  <button onClick={() => setEditingPrice(null)} className="text-xs text-ink/50 px-1">
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingPrice(p.id)
                    setPriceInput(String(p.price ?? ''))
                  }}
                  className="text-right"
                >
                  {p.price != null && <p className="font-mono text-sm underline decoration-dotted">₦{Number(p.price).toLocaleString()}</p>}
                  <p className="text-xs text-indigo">Edit price</p>
                </button>
              )}
              <p
                className={`text-xs font-medium ${
                  p.status === 'live'
                    ? 'text-market-green'
                    : p.status === 'rejected'
                      ? 'text-market-red'
                      : 'text-gold-dark'
                }`}
              >
                {p.status}
              </p>
            </div>
          </button>
          {expanded === p.id && (
            <div>
              {(p.status === 'live' || p.status === 'sold_out' || p.status === 'restocked') && (
                <div className="mt-3 pt-3 border-t border-ink/10">
                  <p className="text-xs font-medium mb-2">
                    Real stock status — reflects true inventory, only you or the director can change this
                  </p>
                  <div className="flex gap-1">
                    {['live', 'sold_out', 'restocked'].map((st) => (
                      <button
                        key={st}
                        onClick={async () => {
                          const { error } = await supabase.rpc('set_product_stock_status', { p_product_id: p.id, p_status: st })
                          if (error) alert(error.message)
                          else load()
                        }}
                        className={`flex-1 text-xs rounded py-1.5 capitalize ${
                          p.status === st ? 'bg-indigo text-white' : 'bg-white border border-ink/20 text-ink/60'
                        }`}
                      >
                        {st === 'live' ? 'Available' : st === 'sold_out' ? 'Sold out' : 'Restocked'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ManageVariantsAndAddons productId={p.id} category={p.category} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ManageVariantsAndAddons({ productId, category }) {
  const [variants, setVariants] = useState([])
  const [addons, setAddons] = useState([])
  const [variantName, setVariantName] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [costPriceSaved, setCostPriceSaved] = useState(null)
  const [savingCost, setSavingCost] = useState(false)
  const [variantPrice, setVariantPrice] = useState('')
  const [addonName, setAddonName] = useState('')
  const [addonPrice, setAddonPrice] = useState('')
  const [quickColour, setQuickColour] = useState('')
  const [quickSize, setQuickSize] = useState('')
  const [quickPrice, setQuickPrice] = useState('')
  const APPAREL_KEYWORDS = ['fashion', 'footwear', 'wear', 'clothing', 'apparel', 'shoe', 'thrift', 'boutique']
  const isApparel = APPAREL_KEYWORDS.some((kw) => category?.toLowerCase().includes(kw))

  async function load() {
    const [{ data: v }, { data: a }, costResult] = await Promise.all([
      supabase.from('product_variants').select('*').eq('product_id', productId),
      supabase.from('product_addons').select('*').eq('product_id', productId),
      supabase.from('product_cost_prices').select('cost_price').eq('product_id', productId).maybeSingle(),
    ])
    setVariants(v || [])
    setAddons(a || [])
    if (costResult.data) {
      setCostPriceSaved(Number(costResult.data.cost_price))
      setCostPrice(String(costResult.data.cost_price))
    }
  }

  async function saveCostPrice() {
    if (!costPrice || Number(costPrice) <= 0) return
    setSavingCost(true)
    const { error } = await supabase.rpc('set_product_cost_price', {
      p_product_id: productId,
      p_cost_price: Number(costPrice),
    })
    setSavingCost(false)
    if (error) {
      alert(error.message)
      return
    }
    setCostPriceSaved(Number(costPrice))
  }

  useEffect(() => {
    load()
  }, [productId])

  async function addVariant(e) {
    e.preventDefault()
    if (!variantName || !variantPrice) return
    await supabase.from('product_variants').insert({
      product_id: productId,
      name: variantName,
      price: Number(variantPrice),
    })
    setVariantName('')
    setVariantPrice('')
    load()
  }

  async function quickAddColourSize(e) {
    e.preventDefault()
    if (!quickPrice) return
    const name = quickColour && quickSize ? `${quickColour} — Size ${quickSize}` : quickColour || (quickSize ? `Size ${quickSize}` : '')
    if (!name) return
    await supabase.from('product_variants').insert({
      product_id: productId,
      name,
      price: Number(quickPrice),
    })
    setQuickColour('')
    setQuickSize('')
    setQuickPrice('')
    load()
  }

  async function addAddon(e) {
    e.preventDefault()
    if (!addonName || !addonPrice) return
    await supabase.from('product_addons').insert({
      product_id: productId,
      name: addonName,
      price: Number(addonPrice),
    })
    setAddonName('')
    setAddonPrice('')
    load()
  }

  return (
    <div className="mt-3 pt-3 border-t border-ink/10 space-y-4">
      <div className="rounded bg-paper/50 border border-ink/10 p-2">
        <p className="text-xs font-medium mb-1">Cost price (only you and admin can ever see this — never an attendant)</p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="₦ real cost per unit"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
          />
          <button onClick={saveCostPrice} disabled={savingCost} className="text-xs bg-indigo text-white rounded px-3 disabled:opacity-60">
            {savingCost ? '…' : 'Save'}
          </button>
        </div>
        {costPriceSaved != null && <p className="text-xs text-market-green mt-1">Saved: ₦{costPriceSaved.toLocaleString()}</p>}
      </div>

      <div>
        <p className="text-xs font-medium mb-2">Variants (e.g. sizes, options)</p>
        {variants.map((v) => (
          <p key={v.id} className="text-xs text-ink/60">
            {v.name} — ₦{Number(v.price).toLocaleString()}
          </p>
        ))}
        {isApparel && (
          <form onSubmit={quickAddColourSize} className="rounded bg-paper/50 border border-ink/10 p-2 mt-2 space-y-1">
            <p className="text-xs text-ink/50">Quick add — colour and/or size</p>
            <div className="flex gap-2">
              <input
                placeholder="Colour (e.g. Blue)"
                value={quickColour}
                onChange={(e) => setQuickColour(e.target.value)}
                className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
              />
              <input
                placeholder="Size (e.g. 42)"
                value={quickSize}
                onChange={(e) => setQuickSize(e.target.value)}
                className="w-24 text-xs rounded border border-ink/20 px-2 py-1"
              />
              <input
                type="number"
                placeholder="₦"
                value={quickPrice}
                onChange={(e) => setQuickPrice(e.target.value)}
                className="w-20 text-xs rounded border border-ink/20 px-2 py-1 font-mono"
              />
              <button type="submit" className="text-xs bg-indigo text-paper rounded px-3">
                Add
              </button>
            </div>
          </form>
        )}
        <form onSubmit={addVariant} className="flex gap-2 mt-2">
          <input
            placeholder="Name"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
          />
          <input
            type="number"
            placeholder="₦"
            value={variantPrice}
            onChange={(e) => setVariantPrice(e.target.value)}
            className="w-20 text-xs rounded border border-ink/20 px-2 py-1 font-mono"
          />
          <button type="submit" className="text-xs bg-indigo text-paper rounded px-3">
            Add
          </button>
        </form>
      </div>

      <div>
        <p className="text-xs font-medium mb-2">Add-ons / extras</p>
        {addons.map((a) => (
          <p key={a.id} className="text-xs text-ink/60">
            {a.name} — +₦{Number(a.price).toLocaleString()}
          </p>
        ))}
        <form onSubmit={addAddon} className="flex gap-2 mt-2">
          <input
            placeholder="Name"
            value={addonName}
            onChange={(e) => setAddonName(e.target.value)}
            className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
          />
          <input
            type="number"
            placeholder="₦"
            value={addonPrice}
            onChange={(e) => setAddonPrice(e.target.value)}
            className="w-20 text-xs rounded border border-ink/20 px-2 py-1 font-mono"
          />
          <button type="submit" className="text-xs bg-indigo text-paper rounded px-3">
            Add
          </button>
        </form>
      </div>
    </div>
  )
}

function AddListing({ sellerId, hub, approved }) {
  const categories = CATEGORIES_BY_HUB[hub] || CATEGORIES_BY_HUB.general_marketplace
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0])
  const relevantUnits = getRealRelevantUnits(category)
  const [categorySuggestion, setCategorySuggestion] = useState(null)
  const suggestionTimerRef = useRef(null)

  // Real, debounced category suggestion — waits for a genuine pause in
  // typing before checking, so it isn't firing a real query on every
  // single keystroke.
  function debouncedSuggestCategory(typedName) {
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    if (!typedName || typedName.trim().length < 3) {
      setCategorySuggestion(null)
      return
    }
    suggestionTimerRef.current = setTimeout(async () => {
      const { data } = await supabase.rpc('suggest_real_category', { p_typed_name: typedName.trim(), p_hub: hub })
      // Real, defensive guard — if the seller kept typing while this real
      // request was in flight, a genuinely stale response should never
      // overwrite what the current, actual input deserves.
      setName((currentName) => {
        if (currentName.trim() === typedName.trim()) {
          setCategorySuggestion(data?.[0] || null)
        }
        return currentName
      })
    }, 500)
  }
  const [brand, setBrand] = useState('')
  const [brandOther, setBrandOther] = useState('')
  const [brandOptions, setBrandOptions] = useState([])

  useEffect(() => {
    const slug = CATEGORY_TO_BRAND_SLUG[category]
    if (!slug) {
      setBrandOptions([])
      setBrand('')
      return
    }
    supabase
      .from('category_brands')
      .select('brand')
      .eq('category', slug)
      .order('brand')
      .then(({ data }) => setBrandOptions((data || []).map((r) => r.brand)))
  }, [category])
  const [price, setPrice] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [karat, setKarat] = useState('')
  const [weightGrams, setWeightGrams] = useState('')
  const [makeModel, setMakeModel] = useState('')
  const [cartonSize, setCartonSize] = useState('')
  const [halfCartonPrice, setHalfCartonPrice] = useState('')
  const [fullCartonPrice, setFullCartonPrice] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')
  const [mileageKm, setMileageKm] = useState('')
  const [transmission, setTransmission] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [dutyStatus, setDutyStatus] = useState('')
  const [accidentHistory, setAccidentHistory] = useState('')
  const [condition, setCondition] = useState('new')
  const [unit, setUnit] = useState('')

  // Real, genuine consistency — if the category changes, a previously
  // selected unit that no longer makes sense for it (e.g. "Per bag" for
  // Seasoning Cubes after switching from Rice) is cleared, not left
  // stale and silently wrong.
  useEffect(() => {
    setUnit('')
  }, [category])
  const [barcode, setBarcode] = useState('')
  const [bulkPrice, setBulkPrice] = useState('')
  const [offersFreeDelivery, setOffersFreeDelivery] = useState(false)
  const [freeDeliveryMinQty, setFreeDeliveryMinQty] = useState('')
  const [offersFreePickupCenter, setOffersFreePickupCenter] = useState(false)
  const [isClearanceSale, setIsClearanceSale] = useState(false)
  const [clearanceSaleNote, setClearanceSaleNote] = useState('')
  const [bulkMinQuantity, setBulkMinQuantity] = useState('')
  const [sizeType, setSizeType] = useState('')
  const [availableSizes, setAvailableSizes] = useState('')
  const [availableColours, setAvailableColours] = useState([])
  // Real, broad detection — the earlier version only matched categories
  // containing the literal words "fashion" or "footwear", which silently
  // never fired for Boutique ("Men's wear"), Thrift Wear ("Clothing
  // (thrift)"), or Kids & Baby ("Apparel (0-13 years)") — exactly the
  // real gap reported. This checks the real, actual category strings
  // used across every hub that sells clothing or shoes.
  const APPAREL_KEYWORDS = ['fashion', 'footwear', 'wear', 'clothing', 'apparel', 'shoe', 'thrift', 'boutique']
  const isFashion = APPAREL_KEYWORDS.some((kw) => category?.toLowerCase().includes(kw))
  const STANDARD_COLOURS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Brown', 'Grey', 'Pink', 'Purple', 'Orange', 'Beige', 'Mixed/Multicolour']
  const [imageFile, setImageFile] = useState(null)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [imageProcessInfo, setImageProcessInfo] = useState(null)
  const [libraryPhotoUrl, setLibraryPhotoUrl] = useState(null)

  async function handlePhotoSelected(rawFile) {
    if (!rawFile) {
      setImageFile(null)
      setImageProcessInfo(null)
      return
    }
    setImageProcessing(true)
    try {
      const result = await processImageForUpload(rawFile)
      setImageFile(result.file)
      setImageProcessInfo(result)
    } catch {
      // Real fallback — if processing fails for any reason (an unusual
      // file, an old browser missing canvas support), upload the
      // original untouched rather than block the seller entirely.
      setImageFile(rawFile)
      setImageProcessInfo(null)
    }
    setImageProcessing(false)
  }
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogResults, setCatalogResults] = useState([])
  const [catalogMessage, setCatalogMessage] = useState(null)
  const [success, setSuccess] = useState(false)

  if (!approved) {
    return (
      <p className="text-ink/50 text-sm">
        Your store must be approved by an admin before you can add listings.
      </p>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // Real self-learning — a name the suggestion engine didn't recognize
    // at all gets queued for a quick admin review, so it strengthens
    // future category suggestions and starter kits for this hub. Never
    // blocks submission if this fails.
    if (!categorySuggestion && name.trim().length >= 3) {
      supabase.rpc('learn_catalog_item', { p_item_name: name.trim(), p_category: category, p_hub: hub }).then(() => {})
    }

    let imageUrls = []
    if (libraryPhotoUrl) {
      imageUrls = [libraryPhotoUrl]
    } else if (imageFile) {
      // Folder convention {seller_id}/{filename} — storage RLS checks this
      // path segment against a real sellers row owned by the caller.
      const path = `${sellerId}/${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, imageFile)

      if (uploadError) {
        setError(uploadError.message)
        setSubmitting(false)
        return
      }
      const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(path)
      imageUrls = [publicUrl.publicUrl]
    }

    if (bulkPrice && Number(bulkPrice) >= Number(price)) {
      setError('Bulk price must be lower than the retail price.')
      setSubmitting(false)
      return
    }

    if (!stockQty || Number(stockQty) < 0) {
      setError('Please enter how many you genuinely have in stock.')
      setSubmitting(false)
      return
    }

    const { data: newProduct, error } = await supabase.from('products').insert({
      seller_id: sellerId,
      hub,
      name,
      description,
      category,
      brand: brand === '__other__' ? brandOther.trim() || null : brand || null,
      price: Number(price),
      stock_quantity: Number(stockQty),
      condition,
      unit: unit || null,
      barcode: barcode.trim() || null,
      bulk_price: bulkPrice ? Number(bulkPrice) : null,
      bulk_min_quantity: bulkPrice ? Number(bulkMinQuantity) : null,
      size_type: isFashion && sizeType ? sizeType : null,
      available_sizes: isFashion && availableSizes ? availableSizes.split(',').map((s) => s.trim()) : null,
      available_colours: isFashion && availableColours.length ? availableColours : null,
      product_type: 'standard',
      image_urls: imageUrls,
      offers_free_delivery: offersFreeDelivery,
      free_delivery_min_quantity: offersFreeDelivery && freeDeliveryMinQty ? Number(freeDeliveryMinQty) : null,
      offers_free_pickup_center_delivery: offersFreePickupCenter,
      is_clearance_sale: isClearanceSale,
      clearance_sale_note: isClearanceSale ? clearanceSaleNote || null : null,
    }).select('id').single()

    // Real precious metal details — genuinely saved now, restored after
    // a systematic audit found this real table sitting completely
    // unused, meaning karat and weight were never actually captured.
    if (!error && newProduct && hub === 'gold_jewelry' && category === 'Pure Gold & Precious Metals' && karat) {
      await supabase.from('product_precious_metal_details').insert({
        product_id: newProduct.id,
        karat,
        weight_grams: weightGrams ? Number(weightGrams) : null,
      })
    }

    // Real vehicle details — same real gap, same real fix.
    if (!error && newProduct && ((hub === 'automobile' && category === 'Vehicles') || (hub === 'motorcycles_tricycles' && ['New Motorcycles', 'Used Motorcycles', 'Electric Motorbikes', 'Tricycles (Keke)'].includes(category))) && makeModel) {
      await supabase.from('product_vehicle_details').insert({
        product_id: newProduct.id,
        make_model: makeModel.trim(),
        year: vehicleYear ? Number(vehicleYear) : null,
        mileage_km: mileageKm ? Number(mileageKm) : null,
        transmission: transmission || null,
        fuel_type: fuelType || null,
        duty_status: dutyStatus || null,
        accident_history: accidentHistory.trim() || null,
      })
    }

    // Real bulk medication details — same real gap, same real fix.
    if (!error && newProduct && hub === 'pharma_medical' && category === 'Bulk Medication' && cartonSize) {
      await supabase.from('product_bulk_medication_details').insert({
        product_id: newProduct.id,
        carton_size: Number(cartonSize),
        half_carton_price: halfCartonPrice ? Number(halfCartonPrice) : null,
        full_carton_price: fullCartonPrice ? Number(fullCartonPrice) : null,
        requires_reseller_verification: true,
      })
    }

    // Real, genuinely orderable variants — not just descriptive text.
    // Every real size/colour combination a seller selects becomes its
    // own selectable option at checkout, exactly like every other
    // variant in this app (Rice by kg, Seasoning Cubes by pack count),
    // just built from Size x Colour instead. Starts at the listing
    // price; the seller can raise individual ones afterward (e.g. a
    // larger size costing more) from My Listings.
    if (!error && newProduct && isFashion) {
      const sizes = availableSizes.trim() ? availableSizes.split(',').map((s) => s.trim()).filter(Boolean) : []
      const colours = availableColours.length ? availableColours : []
      let combos = []
      if (sizes.length && colours.length) {
        combos = colours.flatMap((c) => sizes.map((s) => `${c} — Size ${s}`))
      } else if (sizes.length) {
        combos = sizes.map((s) => `Size ${s}`)
      } else if (colours.length) {
        combos = colours
      }
      if (combos.length) {
        await supabase.from('product_variants').insert(
          combos.map((name) => ({ product_id: newProduct.id, name, price: Number(price) }))
        )
      }
    }

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setName('')
    setDescription('')
    setPrice('')
    setStockQty('')
    setKarat('')
    setWeightGrams('')
    setMakeModel('')
    setVehicleYear('')
    setMileageKm('')
    setTransmission('')
    setFuelType('')
    setDutyStatus('')
    setAccidentHistory('')
    setUnit('')
    setBarcode('')
    setBrand('')
    setBrandOther('')
    setBulkPrice('')
    setBulkMinQuantity('')
    setSizeType('')
    setAvailableSizes('')
    setAvailableColours([])
    setImageFile(null)
    setTimeout(() => setSuccess(false), 3000)
  }

  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('')

  async function loadCatalog(q, categoryFilter) {
    let query = supabase
      .from('master_catalog_items')
      .select('id, base_item, variant_name, brand, suggested_price, unit, category')
      .eq('hub', hub)
      .order('base_item')
      .limit(250)
    if (q && q.trim()) query = query.ilike('base_item', `%${q.trim()}%`)
    if (categoryFilter) query = query.eq('category', categoryFilter)
    const { data } = await query
    setCatalogResults(data || [])
  }

  useEffect(() => {
    loadCatalog('', '')
  }, [hub])

  function searchCatalog(q) {
    setCatalogSearch(q)
    loadCatalog(q, catalogCategoryFilter)
  }

  function filterCatalogByCategory(cat) {
    setCatalogCategoryFilter(cat)
    loadCatalog(catalogSearch, cat)
  }

  async function pickFromCatalog(item, stockQuantity) {
    setCatalogMessage(null)
    const { error } = await supabase.rpc('add_listing_from_catalog', {
      p_seller_id: sellerId,
      p_catalog_item_id: item.id,
      p_price: item.suggested_price,
      p_stock_quantity: Number(stockQuantity) || 1,
    })
    if (error) {
      setCatalogMessage(error.message)
      return
    }
    setCatalogMessage(`${item.variant_name} listed — adjust the price anytime from My Listings if it differs.`)
    loadCatalog(catalogSearch, catalogCategoryFilter)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="rounded border border-gold/30 bg-gold/10 p-3">
        <p className="text-xs font-medium mb-2">
          Select product from your catalog — pick any real item below, or search to filter
        </p>
        <input
          value={catalogSearch}
          onChange={(e) => searchCatalog(e.target.value)}
          placeholder="Search Rice, Flour, Onions… or just browse below"
          className="w-full text-sm rounded border border-ink/20 px-3 py-2 mb-2"
        />
        {categories.length > 1 && (
          <div className="flex gap-1 overflow-x-auto mb-2 pb-1">
            <button
              type="button"
              onClick={() => filterCatalogByCategory('')}
              className={`shrink-0 rounded-full px-2 py-1 text-xs ${!catalogCategoryFilter ? 'bg-indigo text-white' : 'border border-ink/20 text-ink/60'}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => filterCatalogByCategory(c)}
                className={`shrink-0 rounded-full px-2 py-1 text-xs ${catalogCategoryFilter === c ? 'bg-indigo text-white' : 'border border-ink/20 text-ink/60'}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {catalogResults.length > 0 ? (
          <div className="rounded border border-ink/10 bg-white divide-y divide-ink/5 max-h-80 overflow-y-auto">
            {catalogResults.map((item) => (
              <CatalogPickRow key={item.id} item={item} onPick={pickFromCatalog} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink/40">No real catalog items match "{catalogSearch}" for this market yet.</p>
        )}
        {catalogMessage && <p className="text-xs text-market-green mt-2">{catalogMessage}</p>}
      </div>

      <p className="text-xs text-ink/40">— Not in the catalog? List something new below —</p>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Item name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            debouncedSuggestCategory(e.target.value)
          }}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
        />
        {categorySuggestion && categorySuggestion.suggested_category !== category && (
          <button
            type="button"
            onClick={() => {
              setCategory(categorySuggestion.suggested_category)
              setCategorySuggestion(null)
            }}
            className="mt-1.5 w-full text-left rounded bg-gold/10 border border-gold/30 px-3 py-2 text-xs text-gold-dark"
          >
            💡 This looks like it might belong under <span className="font-semibold">{categorySuggestion.suggested_category}</span> — tap to use this category
          </button>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {CATEGORY_TO_BRAND_SLUG[category] && (
        <div>
          <label htmlFor="brand" className="block text-sm font-medium mb-1">
            Brand / variety
          </label>
          {brandOptions.length > 0 ? (
            <select
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            >
              <option value="">-- Select brand --</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="__other__">Other — specify</option>
            </select>
          ) : (
            <p className="text-xs text-ink/40">Loading real brands for this category…</p>
          )}
          {brand === '__other__' && (
            <input
              value={brandOther}
              onChange={(e) => setBrandOther(e.target.value)}
              placeholder="Enter brand name"
              className="w-full mt-2 rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
          )}
        </div>
      )}

      {hub === 'canteen' && FOOD_SPECS[category] && (
        <div className="rounded border border-gold/30 bg-gold/10 p-3">
          <p className="text-xs font-medium mb-2">
            Quick-pick a real dish name — tap one to fill it in, then set your own real price
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FOOD_SPECS[category].map((dish) => (
              <button
                key={dish}
                type="button"
                onClick={() => setName(dish)}
                className={`text-xs rounded-full px-3 py-1.5 border ${
                  name === dish ? 'bg-indigo text-white border-indigo' : 'bg-white border-ink/20 text-ink/70'
                }`}
              >
                {dish}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="price" className="block text-sm font-medium mb-1">
          Retail price (₦) — if sold as a single piece/unit
        </label>
        <input
          id="price"
          type="number"
          min="1"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono"
        />
      </div>

      <div>
        <label htmlFor="stockQty" className="block text-sm font-medium mb-1">
          {realQuantityLabel(unit)}
        </label>
        <input
          id="stockQty"
          type="number"
          min="0"
          required
          value={stockQty}
          onChange={(e) => setStockQty(e.target.value)}
          placeholder="e.g. 50"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono"
        />
      </div>

      {hub === 'pharma_medical' && category === 'Bulk Medication' && (
        <div className="rounded border-2 border-market-red/30 bg-market-red/5 p-3 space-y-2">
          <p className="text-xs font-medium text-market-red">Real bulk medication — carton pricing only, no per-piece retail</p>
          <div>
            <label className="block text-xs text-ink/50 mb-1">Real carton size (units per carton)</label>
            <input type="number" value={cartonSize} onChange={(e) => setCartonSize(e.target.value)} placeholder="e.g. 100" className="w-full rounded border border-ink/20 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-ink/50 mb-1">Half carton price (₦)</label>
              <input type="number" value={halfCartonPrice} onChange={(e) => setHalfCartonPrice(e.target.value)} className="w-full rounded border border-ink/20 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">Full carton price (₦)</label>
              <input type="number" value={fullCartonPrice} onChange={(e) => setFullCartonPrice(e.target.value)} className="w-full rounded border border-ink/20 px-3 py-2 text-sm" />
            </div>
          </div>
          <p className="text-xs text-ink/40">Only real, verified reseller buyers will be able to see and purchase this listing.</p>
        </div>
      )}

      {((hub === 'automobile' && category === 'Vehicles') || (hub === 'motorcycles_tricycles' && ['New Motorcycles', 'Used Motorcycles', 'Electric Motorbikes', 'Tricycles (Keke)'].includes(category))) && (
        <div className="rounded border border-hub-automobile/30 bg-hub-automobile/5 p-3 space-y-2">
          <p className="text-xs font-medium" style={{ color: '#7A3B1E' }}>Real vehicle details — required for buyer trust</p>
          <input value={makeModel} onChange={(e) => setMakeModel(e.target.value)} placeholder="Make & model, e.g. Toyota Camry" className="w-full rounded border border-ink/20 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} placeholder="Year" className="rounded border border-ink/20 px-3 py-2 text-sm" />
            <input type="number" value={mileageKm} onChange={(e) => setMileageKm(e.target.value)} placeholder="Mileage (km)" className="rounded border border-ink/20 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={transmission} onChange={(e) => setTransmission(e.target.value)} className="rounded border border-ink/20 px-3 py-2 text-sm">
              <option value="">Transmission</option>
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="rounded border border-ink/20 px-3 py-2 text-sm">
              <option value="">Fuel type</option>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </div>
          <select value={dutyStatus} onChange={(e) => setDutyStatus(e.target.value)} className="w-full rounded border border-ink/20 px-3 py-2 text-sm">
            <option value="">Duty status</option>
            <option value="duty_paid">Duty paid</option>
            <option value="duty_not_paid">Duty not paid</option>
          </select>
          <textarea
            value={accidentHistory}
            onChange={(e) => setAccidentHistory(e.target.value)}
            placeholder="Real accident history — be honest, buyers check this"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
            rows={2}
          />
        </div>
      )}

      {hub === 'gold_jewelry' && category === 'Pure Gold & Precious Metals' && (
        <div className="rounded border border-gold/30 bg-gold/5 p-3 space-y-2">
          <p className="text-xs font-medium text-gold-dark">Real precious metal details — required for buyer trust</p>
          <div>
            <label htmlFor="karat" className="block text-xs text-ink/50 mb-1">Karat / purity</label>
            <select id="karat" value={karat} onChange={(e) => setKarat(e.target.value)} className="w-full rounded border border-ink/20 px-3 py-2 text-sm">
              <option value="">-- Select --</option>
              <option value="24K">24K</option>
              <option value="22K">22K</option>
              <option value="21K">21K</option>
              <option value="18K">18K</option>
              <option value="9K">9K</option>
            </select>
          </div>
          <div>
            <label htmlFor="weightGrams" className="block text-xs text-ink/50 mb-1">Real weight (grams)</label>
            <input
              id="weightGrams"
              type="number"
              step="0.01"
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
              placeholder="e.g. 15.5"
              className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {(CONDITION_RELEVANT_CATEGORIES.includes(category) || hub === 'green_energy' || hub === 'electrical_equipment') && (
        <div>
          <label htmlFor="condition" className="block text-sm font-medium mb-1">
            Condition
          </label>
          <select
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          >
            <option value="new">New</option>
            <option value="fairly_used">Fairly used</option>
            <option value="nigerian_used">Nigerian used</option>
            {(hub === 'green_energy' || hub === 'electrical_equipment') ? (
              <>
                <option value="uk_used">UK used</option>
                <option value="germany_used">Germany used</option>
                <option value="foreign_used_other">Foreign used (other)</option>
              </>
            ) : (
              <option value="foreign_used_tokunbo">Foreign used (Tokunbo)</option>
            )}
            <option value="refurbished">Refurbished</option>
          </select>
          {(hub === 'green_energy' || hub === 'electrical_equipment') && (
            <p className="text-xs text-ink/50 mt-1">
              Real buyer note: UK-used and Germany-used solar equipment often outsells new China-made stock in this
              market — be specific about origin, it genuinely affects what buyers choose.
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="unit" className="block text-sm font-medium mb-1">
          Size / variation — real quantity this price is for
        </label>
        <p className="text-xs text-ink/40 mb-1">
          {category ? `Showing real, relevant units for ${category}` : 'Choose a category above to see the real, relevant units'}
        </p>
        <select
          id="unit"
          value={relevantUnits.includes(unit) ? unit : unit ? 'Other' : ''}
          onChange={(e) => setUnit(e.target.value === 'Other' ? '' : e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none mb-2"
        >
          <option value="">-- Select size / variation --</option>
          {relevantUnits.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
          <option value="Other">Other (type your own)</option>
        </select>
        {(!relevantUnits.includes(unit)) && (
          <input
            id="unit-other"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. per 4-litre rubber, per crate of 24"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          />
        )}
      </div>

      <div>
        <label htmlFor="barcode" className="block text-sm font-medium mb-1">
          Barcode (optional — lets you scan this item at the Register instead of searching)
        </label>
        <input
          id="barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan or type the real barcode"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono"
        />
      </div>

      <div className="rounded border border-ink/10 bg-paper/50 p-3">
        <p className="text-xs font-medium mb-1">Wholesale price (optional)</p>
        <p className="text-xs text-ink/50 mb-2">
          If you sell this cheaper when someone buys in bulk, set that real price and the real minimum quantity here.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            placeholder="Wholesale price (₦)"
            className="rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono text-sm"
          />
          <input
            type="number"
            value={bulkMinQuantity}
            onChange={(e) => setBulkMinQuantity(e.target.value)}
            placeholder="Minimum quantity"
            className="rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono text-sm"
          />
        </div>
        <p className="text-xs text-ink/40 mt-1">Must be genuinely lower than your retail price — checked on save.</p>
      </div>

      {isFashion && (
        <div className="rounded border border-ink/10 bg-paper/50 p-3 space-y-2">
          <p className="text-xs font-medium">Brand, sizing & colour</p>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Brand (e.g. Nike, Adidas, Zara — leave blank if unbranded)"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface text-sm"
          />
          <select
            value={sizeType}
            onChange={(e) => setSizeType(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface text-sm"
          >
            <option value="">Select size type</option>
            <option value="kids_shoes_20_35">Kids shoes (20–35)</option>
            <option value="adult_shoes_36_48">Adult shoes (36–48)</option>
            <option value="kids_clothing_2_16yrs">Kids clothing (2–16yrs)</option>
            <option value="adult_clothing_xs_5xl">Adult clothing (XS–5XL)</option>
            <option value="numeric_28_48">Numeric (28–48)</option>
            <option value="free_size">Free size</option>
          </select>
          <input
            value={availableSizes}
            onChange={(e) => setAvailableSizes(e.target.value)}
            placeholder="Available sizes, comma-separated (e.g. 40, 41, 42)"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {STANDARD_COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  setAvailableColours((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
                }
                className={`text-xs rounded-full px-2 py-1 border ${
                  availableColours.includes(c) ? 'bg-indigo text-white border-indigo' : 'border-ink/20 text-ink/60'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {(availableSizes.trim() || availableColours.length > 0) && (
            <p className="text-xs text-ink/50">
              A real, separately-selectable option will be created for every size/colour combination below, each
              starting at your listing price — adjust individual ones afterward from My Listings if any should cost
              more (e.g. a larger size).
            </p>
          )}
        </div>
      )}

      <div className="rounded border border-ink/15 p-3 space-y-2">
        <p className="text-sm font-medium">Real perks to attract buyers (optional)</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={offersFreeDelivery} onChange={(e) => setOffersFreeDelivery(e.target.checked)} className="accent-gold" />
          I offer free home delivery
        </label>
        {offersFreeDelivery && (
          <input
            type="number"
            placeholder="Only if buying at least this many (leave blank for always free)"
            value={freeDeliveryMinQty}
            onChange={(e) => setFreeDeliveryMinQty(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm ml-6"
          />
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={offersFreePickupCenter} onChange={(e) => setOffersFreePickupCenter(e.target.checked)} className="accent-gold" />
          I'll deliver to the platform pickup center free — buyer collects from there
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isClearanceSale} onChange={(e) => setIsClearanceSale(e.target.checked)} className="accent-gold" />
          This is a clearance / discount sale
        </label>
        {isClearanceSale && (
          <input
            placeholder="e.g. 'Clearance — 20% off this week only'"
            value={clearanceSaleNote}
            onChange={(e) => setClearanceSaleNote(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm ml-6"
          />
        )}
      </div>

      <PhotoLibraryPicker itemName={name} onPick={(url) => setLibraryPhotoUrl(url)} selectedUrl={libraryPhotoUrl} />

      <div>
        <label htmlFor="image" className="block text-sm font-medium mb-1">
          Or upload your own photo {libraryPhotoUrl && '(optional — a library photo is already selected above)'}
        </label>
        <input
          id="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handlePhotoSelected(e.target.files?.[0] || null)}
          className="w-full text-sm"
        />
        {imageProcessing && <p className="text-xs text-ink/50 mt-1">Optimizing photo…</p>}
        {imageProcessInfo?.wasProcessed && (
          <p className="text-xs text-market-green mt-1">
            ✓ Photo optimized: {(imageProcessInfo.originalSize / 1024 / 1024).toFixed(1)}MB → {(imageProcessInfo.finalSize / 1024).toFixed(0)}KB
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-market-red">
          {error}
        </p>
      )}
      {success && (
        <div className="rounded bg-market-green/10 border border-market-green/30 p-3">
          <p className="text-sm text-market-green font-medium">Listing submitted for review.</p>
          <p className="text-xs text-ink/60 mt-1">
            Selling this in more than one size or brand — like sachet, tin, and refill? Go to <strong>My Listings</strong>,
            tap this item to expand it, and add each real size/brand as a variant with its own price.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || imageProcessing}
        className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : imageProcessing ? 'Optimizing photo…' : 'Submit listing'}
      </button>
    </form>
  )
}

function IncomingOrders({ sellerId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)
  const [expanded, setExpanded] = useState(new Set())
  const [imeiInputs, setImeiInputs] = useState({})
  const [ticketInputs, setTicketInputs] = useState({})
  const [ticketMessage, setTicketMessage] = useState({})

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select(
        `id, status, total_amount, delivery_type, created_at,
         order_items(id, product_id, product_variant_id, quantity, unit_price, line_total, imei,
           products(name, category), product_variants(name), order_item_addons(name, price))`
      )
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
    // New orders need the seller's attention most — show what's actually
    // being ordered right away, not hidden behind an unlabeled tap, since
    // that's exactly the info needed to decide Confirm or Reject.
    setExpanded((prev) => {
      const next = new Set(prev)
      ;(data || []).forEach((o) => {
        if (o.status === 'new') next.add(o.id)
      })
      return next
    })
  }

  useEffect(() => {
    load()

    // Real-time — a new order (or a status change on an existing one)
    // shows up the instant it happens, not just on the next manual reload.
    // Same proven pattern already used for the admin pending-approvals badge.
    const channel = supabase
      .channel(`seller-orders-${sellerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `seller_id=eq.${sellerId}` }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sellerId])

  async function handleConfirm(orderId) {
    setActioning(orderId)
    const { error } = await supabase.rpc('confirm_order', { p_order_id: orderId })
    setActioning(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  async function handleReject(orderId) {
    setActioning(orderId)
    const { error } = await supabase.rpc('reject_order', { p_order_id: orderId, p_reason: 'Declined by seller' })
    setActioning(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  async function handleVerifyTicket(orderId) {
    const code = (ticketInputs[orderId] || '').trim()
    if (!code) return
    const { data, error } = await supabase.rpc('verify_and_redeem_proxy_pickup', {
      p_order_id: orderId,
      p_ticket_code: code,
    })
    setTicketMessage((prev) => ({ ...prev, [orderId]: error ? error.message : data }))
    if (!error) load()
  }

  async function handleMarkPreparing(orderId) {
    const minutes = window.prompt('Estimated minutes until ready? (optional)')
    const estReadyTime = minutes ? new Date(Date.now() + Number(minutes) * 60000).toISOString() : null
    setActioning(orderId)
    const { error } = await supabase.rpc('mark_order_preparing', { p_order_id: orderId, p_est_ready_time: estReadyTime })
    setActioning(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  async function saveImei(orderItemId) {
    const { error } = await supabase.rpc('record_item_imei', { p_order_item_id: orderItemId, p_imei: imeiInputs[orderItemId] })
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (orders.length === 0)
    return (
      <div>
        <PushNotificationToggle label="new orders" />
        <p className="text-ink/50">No orders yet.</p>
      </div>
    )

  return (
    <div className="space-y-2">
      <PushNotificationToggle label="new orders" />
      {orders.map((o) => (
        <div key={o.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <button
            onClick={() =>
              setExpanded((prev) => {
                const next = new Set(prev)
                if (next.has(o.id)) next.delete(o.id)
                else next.add(o.id)
                return next
              })
            }
            className="w-full"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="font-mono text-xs text-ink/50">{o.id.slice(0, 8)}</p>
                <p className="font-mono text-sm">₦{Number(o.total_amount).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-indigo capitalize">{o.status}</span>
                <p className="text-xs text-ink/40">{expanded.has(o.id) ? '▲ Hide items' : '▼ View items'}</p>
              </div>
            </div>
          </button>

          {o.status === 'delivered' && (
            <FeedbackPrompt role="seller" contextType="order_delivered_seller" contextId={o.id} roleLabel="order" />
          )}

          {o.status === 'new' && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleConfirm(o.id)}
                disabled={actioning === o.id}
                className="flex-1 text-xs bg-market-green text-white rounded py-1.5 disabled:opacity-60"
              >
                Confirm
              </button>
              <button
                onClick={() => handleReject(o.id)}
                disabled={actioning === o.id}
                className="flex-1 text-xs bg-market-red text-white rounded py-1.5 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          )}

          {o.status === 'confirmed' && (
            <button
              onClick={() => handleMarkPreparing(o.id)}
              disabled={actioning === o.id}
              className="w-full mt-2 text-xs bg-gold text-ink rounded py-1.5 disabled:opacity-60"
            >
              🍳 Mark as preparing
            </button>
          )}

          {o.delivery_type === 'proxy_pickup' && (o.status === 'confirmed' || o.status === 'preparing') && (
            <div className="mt-2 pt-2 border-t border-ink/10">
              <p className="text-xs font-medium mb-1">👤 Proxy pickup — verify their real ticket before releasing</p>
              <div className="flex gap-1">
                <input
                  value={ticketInputs[o.id] || ''}
                  onChange={(e) => setTicketInputs((prev) => ({ ...prev, [o.id]: e.target.value }))}
                  placeholder="Paste their ticket code"
                  className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
                />
                <button onClick={() => handleVerifyTicket(o.id)} className="text-xs bg-indigo text-white rounded px-3">
                  Verify
                </button>
              </div>
              {ticketMessage[o.id] && (
                <p className={`text-xs mt-1 ${ticketMessage[o.id].startsWith('Verified') ? 'text-market-green' : 'text-market-red'}`}>
                  {ticketMessage[o.id]}
                </p>
              )}
            </div>
          )}

          {expanded.has(o.id) && (
            <div className="mt-2 pt-2 border-t border-ink/10 space-y-2">
              {o.order_items?.map((item) => (
                <div key={item.id} className="text-xs">
                  <p className="font-medium">
                    {item.quantity} × {item.products?.name}
                    {item.product_variants?.name ? ` (${item.product_variants.name})` : ''} — ₦{Number(item.line_total).toLocaleString()}
                  </p>
                  <p className="text-ink/40">₦{Number(item.unit_price).toLocaleString()} each</p>
                  {item.order_item_addons?.length > 0 && (
                    <p className="text-ink/50">+ {item.order_item_addons.map((a) => a.name).join(', ')}</p>
                  )}
                  {item.imei ? (
                    <p className="text-ink/50 font-mono">IMEI: {item.imei}</p>
                  ) : (
                    <div className="flex gap-1 mt-1">
                      <input
                        placeholder="Record IMEI (phones/laptops)"
                        value={imeiInputs[item.id] || ''}
                        onChange={(e) => setImeiInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
                      />
                      <button
                        onClick={() => saveImei(item.id)}
                        className="text-xs bg-indigo text-white rounded px-2"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function TradeInOffers({ sellerId }) {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [counterPrices, setCounterPrices] = useState({})
  const [acting, setActing] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('trade_in_offers')
      .select('id, item_description, estimated_karat, estimated_weight_grams, desired_outcome, buyer_asking_price, seller_offer_price, status')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
    setOffers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function respond(offerId, action) {
    setActing(offerId)
    const { error } = await supabase.rpc('respond_to_trade_in_offer', {
      p_offer_id: offerId,
      p_action: action,
      p_seller_offer_price: counterPrices[offerId] ? Number(counterPrices[offerId]) : null,
    })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  async function completeBuyback(offerId) {
    setActing(offerId)
    const { error } = await supabase.rpc('complete_trade_in_cash_buyback', { p_offer_id: offerId })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (offers.length === 0) return <p className="text-ink/50">No trade-in offers yet.</p>

  return (
    <div className="space-y-2">
      {offers.map((o) => (
        <div key={o.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <p className="text-sm font-medium">{o.item_description}</p>
          <p className="text-xs text-ink/50">
            {o.estimated_karat && `${o.estimated_karat} · `}
            {o.estimated_weight_grams && `${o.estimated_weight_grams}g · `}
            {o.desired_outcome.replace('_', ' ')}
            {o.buyer_asking_price != null && ` · Asking ₦${Number(o.buyer_asking_price).toLocaleString()}`}
          </p>
          <p className="text-xs font-medium text-indigo capitalize mt-1">{o.status}</p>

          {(o.status === 'pending' || o.status === 'countered') && (
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                placeholder="₦ offer"
                value={counterPrices[o.id] || ''}
                onChange={(e) => setCounterPrices((prev) => ({ ...prev, [o.id]: e.target.value }))}
                className="w-24 text-xs rounded border border-ink/20 px-2 py-1 font-mono"
              />
              <button
                onClick={() => respond(o.id, 'counter')}
                disabled={acting === o.id}
                className="text-xs bg-gold text-ink rounded px-2 py-1.5 disabled:opacity-60"
              >
                Counter
              </button>
              <button
                onClick={() => respond(o.id, 'accept')}
                disabled={acting === o.id}
                className="text-xs bg-market-green text-white rounded px-2 py-1.5 disabled:opacity-60"
              >
                Accept
              </button>
              <button
                onClick={() => respond(o.id, 'decline')}
                disabled={acting === o.id}
                className="text-xs bg-market-red text-white rounded px-2 py-1.5 disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          )}

          {o.status === 'accepted' && o.desired_outcome === 'cash_buyback' && (
            <button
              onClick={() => completeBuyback(o.id)}
              disabled={acting === o.id}
              className="w-full mt-2 text-xs bg-market-green text-white rounded py-1.5 disabled:opacity-60"
            >
              Complete cash buyback — pay ₦{Number(o.seller_offer_price).toLocaleString()}
            </button>
          )}
          {o.status === 'accepted' && o.desired_outcome === 'exchange' && (
            <p className="text-xs text-ink/50 mt-2">
              Accepted as an exchange — apply the agreed credit manually against the buyer's next order.
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function InstalmentInquiryInbox({ sellerId }) {
  const [optedIn, setOptedIn] = useState(null)
  const [inquiries, setInquiries] = useState([])
  const [priceDrafts, setPriceDrafts] = useState({})
  const [termsDrafts, setTermsDrafts] = useState({})

  async function load() {
    const { data: s } = await supabase.from('sellers').select('instalment_opt_in').eq('id', sellerId).single()
    setOptedIn(s?.instalment_opt_in || false)
    if (s?.instalment_opt_in) {
      const { data } = await supabase
        .from('instalment_inquiries')
        .select('id, category, description, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
      setInquiries(data || [])
    }
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function toggleOptIn() {
    const next = !optedIn
    await supabase.from('sellers').update({ instalment_opt_in: next }).eq('id', sellerId)
    setOptedIn(next)
    if (next) load()
  }

  async function respond(inquiryId) {
    const price = priceDrafts[inquiryId]
    if (!price) return
    await supabase.from('instalment_inquiry_responses').insert({
      inquiry_id: inquiryId,
      seller_id: sellerId,
      price: Number(price),
      terms_notes: termsDrafts[inquiryId] || null,
    })
    alert('Real reply sent to the buyer.')
    setPriceDrafts((p) => ({ ...p, [inquiryId]: '' }))
    setTermsDrafts((p) => ({ ...p, [inquiryId]: '' }))
  }

  if (optedIn === null) return null

  return (
    <div className="rounded border border-ink/10 bg-surface p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold">💳 Pay Gradually — buyer requests</p>
        <button onClick={toggleOptIn} className={`text-xs rounded-full px-3 py-1 ${optedIn ? 'bg-market-green/20 text-market-green' : 'bg-ink/10 text-ink/60'}`}>
          {optedIn ? '✓ Offering this' : 'Not offering — tap to enable'}
        </button>
      </div>
      {optedIn && (
        <>
          <p className="text-xs text-ink/50 mb-2">
            Real, open requests from real buyers. Reply with your price and terms — they'll see it immediately.
          </p>
          {inquiries.length === 0 && <p className="text-xs text-ink/40">No open requests right now.</p>}
          {inquiries.map((inq) => (
            <div key={inq.id} className="rounded border border-ink/10 bg-paper/50 px-3 py-2 mb-2">
              <p className="text-xs text-ink/40">{inq.category}</p>
              <p className="text-sm">{inq.description}</p>
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  placeholder="Your price ₦"
                  value={priceDrafts[inq.id] || ''}
                  onChange={(e) => setPriceDrafts((p) => ({ ...p, [inq.id]: e.target.value }))}
                  className="w-28 text-xs rounded border border-ink/20 px-2 py-1 font-mono"
                />
                <input
                  placeholder="Terms (e.g. deposit, duration)"
                  value={termsDrafts[inq.id] || ''}
                  onChange={(e) => setTermsDrafts((p) => ({ ...p, [inq.id]: e.target.value }))}
                  className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
                />
                <button onClick={() => respond(inq.id)} className="text-xs bg-indigo text-white rounded px-3">
                  Reply
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function StoreOverview({ sellerId, setTab }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [returnPolicy, setReturnPolicy] = useState('')
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [policySaved, setPolicySaved] = useState(false)
  const [commissionRate, setCommissionRate] = useState(null)
  const [sellerCode, setSellerCode] = useState(null)

  useEffect(() => {
    async function loadCode() {
      const { data } = await supabase.from('sellers').select('seller_code').eq('id', sellerId).single()
      setSellerCode(data?.seller_code || null)
    }
    loadCode()
  }, [sellerId])

  useEffect(() => {
    async function loadPolicy() {
      const { data } = await supabase.from('sellers').select('return_policy').eq('id', sellerId).single()
      setReturnPolicy(data?.return_policy || '')
    }
    loadPolicy()
  }, [sellerId])

  // Real, direct commission transparency — restored after a systematic
  // audit found sellers genuinely had no way to see this anywhere.
  useEffect(() => {
    async function loadCommission() {
      const { data } = await supabase.rpc('get_seller_commission_rate', { p_seller_id: sellerId })
      setCommissionRate(data)
    }
    loadCommission()
  }, [sellerId])

  async function savePolicy() {
    setSavingPolicy(true)
    await supabase.from('sellers').update({ return_policy: returnPolicy || null }).eq('id', sellerId)
    setSavingPolicy(false)
    setPolicySaved(true)
    setTimeout(() => setPolicySaved(false), 2000)
  }

  useEffect(() => {
    async function load() {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [{ data: orders }, { count: listingCount }, { data: todayOrders }, { data: weekOrders }] = await Promise.all([
        supabase.from('orders').select('status, total_amount').eq('seller_id', sellerId),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId),
        supabase.from('orders').select('total_amount').eq('seller_id', sellerId).eq('status', 'delivered').gte('delivered_at', todayStart),
        supabase.from('orders').select('total_amount').eq('seller_id', sellerId).eq('status', 'delivered').gte('delivered_at', weekStart),
      ])

      const delivered = (orders || []).filter((o) => o.status === 'delivered')
      const totalRevenue = delivered.reduce((sum, o) => sum + Number(o.total_amount), 0)
      const pending = (orders || []).filter((o) => o.status === 'confirmed' || o.status === 'assigned').length

      setStats({
        totalOrders: (orders || []).length,
        deliveredOrders: delivered.length,
        totalRevenue,
        totalListings: listingCount || 0,
        salesToday: (todayOrders || []).reduce((sum, o) => sum + Number(o.total_amount), 0),
        ordersToday: (todayOrders || []).length,
        salesThisWeek: (weekOrders || []).reduce((sum, o) => sum + Number(o.total_amount), 0),
        pendingOrders: pending,
      })
      setLoading(false)
    }
    load()
  }, [sellerId])

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (!stats) return null

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded border border-ink/10 bg-surface px-3 py-2">
        <p className="text-xs text-ink/50">Sales today</p>
        <p className="text-lg font-display font-semibold text-indigo">₦{stats.salesToday.toLocaleString()}</p>
        <p className="text-xs text-ink/40">{stats.ordersToday} order{stats.ordersToday === 1 ? '' : 's'}</p>
      </div>
      <div className="rounded border border-ink/10 bg-surface px-3 py-2">
        <p className="text-xs text-ink/50">This week</p>
        <p className="text-lg font-display font-semibold text-indigo">₦{stats.salesThisWeek.toLocaleString()}</p>
      </div>
      <div className="rounded border border-ink/10 bg-surface px-3 py-2">
        <p className="text-xs text-ink/50">Items listed</p>
        <p className="text-lg font-display font-semibold text-market-green">{stats.totalListings}</p>
        <p className="text-xs text-ink/40">active listings</p>
      </div>
      <div className="rounded border border-ink/10 bg-surface px-3 py-2">
        <p className="text-xs text-ink/50">Pending orders</p>
        <p className="text-lg font-display font-semibold text-gold-dark">{stats.pendingOrders}</p>
        <p className="text-xs text-ink/40">needs action</p>
      </div>
      <div className="col-span-2 flex gap-2">
        <button onClick={() => setTab('add')} className="flex-1 text-sm bg-indigo text-white rounded py-2">
          ↑ Go to Upload
        </button>
        <button onClick={() => setTab('orders')} className="flex-1 text-sm bg-gold text-ink rounded py-2">
          View orders
        </button>
      </div>

      <div className="rounded border border-ink/10 bg-surface px-3 py-2 col-span-2">
        <p className="text-xs text-ink/50">Revenue from delivered orders (all time)</p>
        <p className="font-mono text-xl text-indigo">₦{stats.totalRevenue.toLocaleString()}</p>
      </div>

      <div className="col-span-2">
        <InstalmentInquiryInbox sellerId={sellerId} />
      </div>

      {sellerCode && (
        <div className="rounded border border-ink/10 bg-surface px-3 py-3 col-span-2 flex items-center gap-3">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${window.location.origin}/store/${sellerCode}`)}`}
            alt="Your store's scannable code"
            className="w-20 h-20 rounded border border-ink/10"
          />
          <div>
            <p className="text-xs text-ink/50">Your real, unique store ID</p>
            <p className="font-mono text-lg font-semibold text-indigo">{sellerCode}</p>
            <p className="text-xs text-ink/40 mt-1">
              Print this code in your store — customers scan it to open your storefront directly.
            </p>
          </div>
        </div>
      )}
      <p className="text-xs text-ink/40 col-span-2">
        Revenue here is your store's gross total from delivered orders — it doesn't subtract any costs. Use the
        P&L tab to work out actual profit.
      </p>

      {commissionRate != null && (
        <div className="col-span-2 rounded bg-surface px-3 py-2 mb-1">
          <p className="text-xs text-ink/50">Your real commission rate</p>
          <p className="text-sm font-semibold text-indigo">{(commissionRate * 100).toFixed(1)}% per completed order</p>
        </div>
      )}

      <SellerIdentityQR sellerId={sellerId} />

      <div className="col-span-2 pt-3 border-t border-ink/10">
        <label className="block text-sm font-medium mb-1">Return policy</label>
        <p className="text-xs text-ink/50 mb-2">Shown to buyers on your listings. Leave blank if you don't have one.</p>
        <textarea
          value={returnPolicy}
          onChange={(e) => setReturnPolicy(e.target.value)}
          rows={3}
          className="w-full text-sm rounded border border-ink/20 px-3 py-2"
        />
        <button
          onClick={savePolicy}
          disabled={savingPolicy}
          className="mt-2 text-sm bg-indigo text-white rounded px-4 py-2 disabled:opacity-60"
        >
          {savingPolicy ? 'Saving…' : policySaved ? 'Saved ✓' : 'Save return policy'}
        </button>
      </div>
    </div>
  )
}

// Real seller identity — a real, short, human-readable code and a real
// scannable QR code, matching the reference exactly: shown on request
// via a real button, not permanently taking up space.
function SellerIdentityQR({ sellerId }) {
  const [sellerCode, setSellerCode] = useState(null)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sellers').select('seller_code').eq('id', sellerId).single()
      setSellerCode(data?.seller_code)
    }
    load()
  }, [sellerId])

  return (
    <div className="col-span-2 rounded border-2 border-gold/40 bg-gold/10 px-3 py-3 mt-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">Your seller identity</p>
        <p className="font-mono text-sm font-bold text-gold-dark">{sellerCode || '…'}</p>
      </div>
      <p className="text-xs text-ink/50 mb-2">
        Print your QR code and paste it in your store. Buyers scan it to go directly to your listings on UMC-BCK —
        no searching needed.
      </p>
      {showQR ? (
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${window.location.origin}/store/${sellerCode || sellerId}`)}`}
          alt="Scannable real QR code for this store"
          className="rounded border border-ink/10 mx-auto"
          width={140}
          height={140}
        />
      ) : (
        <button onClick={() => setShowQR(true)} className="w-full text-sm bg-gold text-ink font-medium rounded py-2">
          📱 Show my QR code to print
        </button>
      )}
    </div>
  )
}

// Reusable calculation function, matching the original spec's explicit
// requirement that this not be hardcoded to one screen — real reporting
// or analytics work can reuse the same logic later.
function calculateProfitLoss({ costPrice, sellingPrice, quantitySold, totalExpenses }) {
  const totalRevenue = sellingPrice * quantitySold
  const totalCost = costPrice * quantitySold + totalExpenses
  const netProfit = totalRevenue - totalCost
  const profitMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  let verdict
  if (netProfit < 0) verdict = 'Loss'
  else if (netProfit === 0) verdict = 'Break even'
  else if (profitMarginPct < 10) verdict = 'Low margin'
  else verdict = 'Healthy profit'

  return { totalRevenue, totalCost, netProfit, profitMarginPct, verdict }
}

function ProfitLossCalculator() {
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [quantitySold, setQuantitySold] = useState('')
  const [totalExpenses, setTotalExpenses] = useState('')

  const ready = costPrice && sellingPrice && quantitySold
  const result = ready
    ? calculateProfitLoss({
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        quantitySold: Number(quantitySold),
        totalExpenses: Number(totalExpenses) || 0,
      })
    : null

  const verdictColor = {
    Loss: 'text-market-red',
    'Break even': 'text-ink/60',
    'Low margin': 'text-gold-dark',
    'Healthy profit': 'text-market-green',
  }

  return (
    <div className="max-w-sm">
      <p className="text-xs text-ink/50 mb-3">
        Enter your own figures — UMC-BCK doesn't track your cost of goods automatically, since that's information
        only you have.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Cost price per unit (₦)</label>
          <input
            type="number"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Selling price per unit (₦)</label>
          <input
            type="number"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Quantity sold</label>
          <input
            type="number"
            value={quantitySold}
            onChange={(e) => setQuantitySold(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Total expenses (₦, optional)</label>
          <input
            type="number"
            value={totalExpenses}
            onChange={(e) => setTotalExpenses(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2 font-mono"
          />
        </div>

        {result && (
          <div className="rounded border border-ink/10 bg-surface p-3 space-y-1">
            <p className="text-xs text-ink/50">
              Total revenue: <span className="font-mono text-ink">₦{result.totalRevenue.toLocaleString()}</span>
            </p>
            <p className="text-xs text-ink/50">
              Total cost: <span className="font-mono text-ink">₦{result.totalCost.toLocaleString()}</span>
            </p>
            <p className={`text-lg font-display font-semibold ${result.netProfit >= 0 ? 'text-market-green' : 'text-market-red'}`}>
              {result.netProfit >= 0 ? 'Profit' : 'Loss'}: ₦{Math.abs(result.netProfit).toLocaleString()}
            </p>
            <p className="text-xs text-ink/50">Profit margin: {result.profitMarginPct.toFixed(1)}%</p>
            <p className={`text-sm font-medium ${verdictColor[result.verdict]}`}>{result.verdict}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FeaturedPlacement({ sellerId }) {
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)

  const TIERS = [
    { value: 'category', label: 'Category', price: 5000, desc: 'Top placement within your own hub' },
    { value: 'cross_hub', label: 'Cross-hub', price: 10000, desc: 'Also appears in general "Recommended" sections' },
    { value: 'platform_wide', label: 'Platform-wide', price: 15000, desc: 'Top placement across every relevant search' },
  ]

  async function load() {
    const { data } = await supabase
      .from('featured_placements')
      .select('tier, monthly_price, current_period_end, status')
      .eq('seller_id', sellerId)
      .eq('status', 'active')
      .maybeSingle()
    setCurrent(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function purchase(tier) {
    setPurchasing(tier)
    const { error } = await supabase.rpc('purchase_featured_placement', { p_seller_id: sellerId, p_tier: tier })
    setPurchasing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>

  return (
    <div>
      <p className="text-xs text-ink/50 mb-3">
        Real monthly subscription, billed automatically from your wallet every 30 days. Rates researched against
        comparable Nigerian marketplace pricing (Jumia's own Sponsored Products package) and global practice, then
        brought back for ratification.
      </p>

      {current && (
        <div className="rounded bg-market-green/10 px-3 py-2 mb-4">
          <p className="text-sm font-medium capitalize">Active: {current.tier.replace('_', ' ')} — ₦{Number(current.monthly_price).toLocaleString()}/month</p>
          <p className="text-xs text-ink/50">Renews {new Date(current.current_period_end).toLocaleDateString()}</p>
        </div>
      )}

      <div className="space-y-2">
        {TIERS.map((t) => (
          <div key={t.value} className="rounded border border-ink/10 bg-surface px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t.label} — ₦{t.price.toLocaleString()}/month</p>
              <p className="text-xs text-ink/50">{t.desc}</p>
            </div>
            <button
              onClick={() => purchase(t.value)}
              disabled={purchasing === t.value || current?.tier === t.value}
              className="text-xs bg-indigo text-white rounded px-3 py-1.5 disabled:opacity-60"
            >
              {current?.tier === t.value ? 'Active' : purchasing === t.value ? '…' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CatalogPickRow({ item, onPick }) {
  const [qty, setQty] = useState('1')
  return (
    <div className="flex items-center justify-between px-3 py-2 gap-2">
      <div className="min-w-0">
        <p className="text-sm truncate">
          {item.variant_name} {item.brand && <span className="text-ink/40">· {item.brand}</span>}
        </p>
        <p className="text-xs text-ink/40">Suggested ₦{Number(item.suggested_price).toLocaleString()}</p>
      </div>
      <input
        type="number"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="w-14 text-xs rounded border border-ink/20 px-1 py-1 shrink-0"
      />
      <button
        type="button"
        onClick={() => onPick(item, qty)}
        className="text-xs bg-indigo text-white rounded px-3 py-1 shrink-0"
      >
        Add
      </button>
    </div>
  )
}

function PhotoLibraryPicker({ itemName, onPick, selectedUrl }) {
  const [matches, setMatches] = useState([])

  useEffect(() => {
    let cancelled = false
    async function search() {
      if (!itemName || itemName.trim().length < 3) {
        setMatches([])
        return
      }
      const { data } = await supabase
        .from('catalog_photo_library')
        .select('id, base_item, image_url')
        .ilike('base_item', `%${itemName.trim()}%`)
        .limit(6)
      if (!cancelled) setMatches(data || [])
    }
    search()
    return () => {
      cancelled = true
    }
  }, [itemName])

  if (matches.length === 0) return null

  return (
    <div className="rounded border border-gold/30 bg-gold/10 p-3">
      <p className="text-xs font-medium mb-2">Real photos from our library — tap to use instead of uploading your own</p>
      <div className="flex gap-2 overflow-x-auto">
        {matches.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.image_url)}
            className={`shrink-0 rounded border-2 overflow-hidden ${
              selectedUrl === m.image_url ? 'border-indigo' : 'border-transparent'
            }`}
          >
            <img src={m.image_url} alt={m.base_item} className="w-16 h-16 object-cover bg-white" />
          </button>
        ))}
      </div>
    </div>
  )
}

// Real seller-side answer view — every unanswered question across this
// store's real listings, in one place, so a seller doesn't need to check
// each product individually to find what needs a reply.
// Real "Sales Reports" — restored after being found genuinely missing
// during a direct, systematic audit. Combines real online orders, real
// walk-in POS sales by payment method, and real credit collection
// status — using the same real, already-correct backend function that
// was sitting unused this whole time, not rebuilt from scratch.
function SalesReports({ sellerId }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [itemSummary, setItemSummary] = useState(null)
  const [itemLoading, setItemLoading] = useState(false)

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase.from('products').select('id, name').eq('seller_id', sellerId).order('name')
      setProducts(data || [])
    }
    loadProducts()
  }, [sellerId])

  // Real per-item drill-down — restored after a systematic audit found
  // this real function sitting completely unused, with no way for a
  // seller to check how one specific real item is actually performing.
  async function loadItemSummary() {
    if (!selectedProductId) return
    setItemLoading(true)
    const { data } = await supabase.rpc('get_item_sales_summary', {
      p_seller_id: sellerId,
      p_product_id: selectedProductId,
      p_from_date: fromDate,
      p_to_date: toDate,
    })
    setItemSummary(data?.[0] || null)
    setItemLoading(false)
  }

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_sales_report', {
      p_seller_id: sellerId,
      p_from_date: fromDate,
      p_to_date: toDate,
    })
    if (!error) setReport(data?.[0] || null)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  return (
    <div>
      <p className="text-sm font-medium mb-2">Real sales report</p>
      <div className="flex gap-2 mb-3">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="flex-1 rounded border border-ink/20 px-2 py-1.5 text-sm" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="flex-1 rounded border border-ink/20 px-2 py-1.5 text-sm" />
        <button onClick={load} className="text-xs bg-indigo text-white rounded px-3">
          Update
        </button>
      </div>

      {loading ? (
        <p className="text-ink/50 text-sm">Loading…</p>
      ) : !report ? (
        <p className="text-ink/50 text-sm">No real data for this range.</p>
      ) : (
        <div className="space-y-2">
          <div className="rounded bg-indigo/10 px-3 py-2">
            <p className="text-xs text-ink/50">Real combined total</p>
            <p className="text-xl font-display font-semibold text-indigo">₦{Number(report.combined_total).toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-surface px-3 py-2">
              <p className="text-xs text-ink/50">Online orders</p>
              <p className="text-sm font-semibold">₦{Number(report.online_total).toLocaleString()}</p>
            </div>
            <div className="rounded bg-surface px-3 py-2">
              <p className="text-xs text-ink/50">Walk-in cash</p>
              <p className="text-sm font-semibold">₦{Number(report.walk_in_cash).toLocaleString()}</p>
            </div>
            <div className="rounded bg-surface px-3 py-2">
              <p className="text-xs text-ink/50">Walk-in transfer</p>
              <p className="text-sm font-semibold">₦{Number(report.walk_in_transfer).toLocaleString()}</p>
            </div>
            <div className="rounded bg-surface px-3 py-2">
              <p className="text-xs text-ink/50">Walk-in credit sold</p>
              <p className="text-sm font-semibold">₦{Number(report.walk_in_credit).toLocaleString()}</p>
            </div>
            <div className="rounded bg-market-green/10 px-3 py-2">
              <p className="text-xs text-market-green">Real credit collected</p>
              <p className="text-sm font-semibold text-market-green">₦{Number(report.credit_collected).toLocaleString()}</p>
            </div>
            <div className="rounded bg-gold/10 px-3 py-2">
              <p className="text-xs text-gold-dark">Real credit still owed</p>
              <p className="text-sm font-semibold text-gold-dark">₦{Number(report.credit_outstanding).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-ink/10">
            <p className="text-xs font-medium mb-2">Check one real item specifically</p>
            <div className="flex gap-2 mb-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 rounded border border-ink/20 px-2 py-1.5 text-sm"
              >
                <option value="">-- Select item --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button onClick={loadItemSummary} disabled={!selectedProductId || itemLoading} className="text-xs bg-indigo text-white rounded px-3 disabled:opacity-60">
                {itemLoading ? '…' : 'Check'}
              </button>
            </div>
            {itemSummary && (
              <div className="rounded bg-surface px-3 py-2 text-sm">
                <p className="font-medium mb-1">{itemSummary.item_name}</p>
                <p className="text-xs text-ink/60">
                  Online: {itemSummary.online_quantity} · Walk-in: {itemSummary.walk_in_quantity} · Total: {itemSummary.total_quantity} sold
                </p>
                <p className="font-mono text-sm text-indigo mt-1">₦{Number(itemSummary.total_revenue).toLocaleString()} real revenue</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SellerProductQuestions({ sellerId }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [answering, setAnswering] = useState(null)
  const [answerText, setAnswerText] = useState('')

  async function load() {
    const { data } = await supabase
      .from('product_questions')
      .select('id, question, answer, created_at, products!inner(name, seller_id)')
      .eq('products.seller_id', sellerId)
      .order('created_at', { ascending: false })
    setQuestions(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function submitAnswer(id) {
    if (!answerText.trim()) return
    await supabase
      .from('product_questions')
      .update({ answer: answerText.trim(), answered_at: new Date().toISOString() })
      .eq('id', id)
    setAnswering(null)
    setAnswerText('')
    load()
  }

  if (loading) return <p className="text-sm text-ink/50">Loading…</p>
  if (questions.length === 0) return <p className="text-sm text-ink/50">No questions yet on any of your listings.</p>

  const unanswered = questions.filter((q) => !q.answer)
  const answered = questions.filter((q) => q.answer)

  return (
    <div className="space-y-4">
      {unanswered.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-market-red">Needs your reply ({unanswered.length})</p>
          <div className="space-y-2">
            {unanswered.map((q) => (
              <div key={q.id} className="rounded border border-gold/40 bg-gold/10 p-3">
                <p className="text-xs text-ink/50">{q.products.name}</p>
                <p className="text-sm font-medium">{q.question}</p>
                {answering === q.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Your real answer…"
                      className="flex-1 rounded border border-ink/20 px-3 py-1.5 text-sm"
                      autoFocus
                    />
                    <button onClick={() => submitAnswer(q.id)} className="text-xs bg-market-green text-white rounded px-3">
                      Send
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAnswering(q.id)
                      setAnswerText('')
                    }}
                    className="text-xs text-indigo underline mt-1"
                  >
                    Reply
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {answered.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-ink/50">Already answered ({answered.length})</p>
          <div className="space-y-2">
            {answered.map((q) => (
              <div key={q.id} className="rounded bg-ink/5 p-3">
                <p className="text-xs text-ink/50">{q.products.name}</p>
                <p className="text-sm">Q: {q.question}</p>
                <p className="text-sm text-market-green">A: {q.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

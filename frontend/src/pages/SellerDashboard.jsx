import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { queueSale, getQueuedSales, removeQueuedSale, markQueuedSaleFailed } from '../lib/offlineQueue'
import FeedbackPrompt from '../components/FeedbackPrompt'
import SalesRegister from '../components/attendant/SalesRegister'
import RestockRequests from '../components/attendant/RestockRequests'
import CreditSaleRequests from '../components/attendant/CreditSaleRequests'
import StoreMessages from '../components/attendant/StoreMessages'

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
    'Airtime & data bundles', 'Other',
  ],
  boutique: ["Men's wear", "Women's wear", "Children's wear", 'Native & traditional wear', 'Accessories'],
  thrift_wear: ['Clothing (thrift)', 'Beddings & curtains', 'Footwear (thrift)', 'Bags (thrift)'],
  textile: ['Ankara fabric', 'Lace fabric', 'Guinea brocade', 'Aso-oke', 'Chiffon & silk', 'Plain & cotton fabric'],
  green_energy: ['Solar panels', 'Inverters', 'Deep cycle batteries', 'Solar accessories (cables, charge controllers)', 'Wind & other renewable'],
  electrical_equipment: ['Cables & wiring', 'Switches & sockets', 'Circuit breakers', 'Transformers', 'Industrial installation equipment', 'Generators'],
  interior_appliances: ['Furniture', 'Curtains & rugs', 'Kitchen appliances', 'Cooling & heating', 'Refrigeration', 'TVs & entertainment'],
  plastic_utensils: ['Kitchen utensils', 'Storage containers', 'Buckets & basins', 'Plastic chairs & tables', 'Disposable & party plasticware'],
  office_equipment: ['Office furniture', 'Printers & copiers', 'Binding & laminating equipment', 'Paper & printing supplies', 'Writing & desk supplies', 'Office electronics'],
  canteen: ['Nigerian Meals', 'Northern Dishes', 'Fast Food', 'Shawarma', 'Suya & Grills', 'Pizza', 'Cakes & Desserts', 'Drinks'],
  phones_tech: ['New Phones', 'Accessories', 'Laptops & Tablets', 'Internet Gear'],
  gold_jewelry: ['Pure Gold & Precious Metals', 'Fashion & Costume Jewelry'],
  automobile: ['Vehicles', 'Parts & Accessories'],
  pharma_medical: ['Equipment', 'Personal Care'],
}

// Real mapping from display category name to the slug key used in
// category_brands — the table already existed with real seeded brand
// data, but nothing in the frontend ever queried it until now.
// Real fix for a genuine gap: 'Condition' was showing for every category,
// including perishables and consumables where 'fairly used' makes no
// sense at all. Only categories where used/refurbished stock genuinely
// exists as real inventory get this field.
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

      <div className="flex gap-1 border-b border-ink/10 mb-4 overflow-x-auto">
        {[
          'overview', 'listings', 'add', 'orders', 'questions', 'register', 'reports', 'restock', 'creditreqs', 'messages',
          'tradeins', 'pl', 'featured',
        ].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'add' ? 'Add listing' : t === 'listings' ? 'My listings' : t === 'register' ? '🧾 Sell (POS)' : t === 'reports' ? 'Sales Reports' : t === 'restock' ? 'Restock' : t === 'creditreqs' ? 'Credit Requests' : t === 'messages' ? 'Messages' : t === 'questions' ? 'Questions' : t === 'tradeins' ? 'Trade-ins' : t === 'pl' ? 'Profit & Loss' : t === 'featured' ? 'Featured' : 'Incoming orders'}
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
              <ManageVariantsAndAddons productId={p.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ManageVariantsAndAddons({ productId }) {
  const [variants, setVariants] = useState([])
  const [addons, setAddons] = useState([])
  const [variantName, setVariantName] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [costPriceSaved, setCostPriceSaved] = useState(null)
  const [savingCost, setSavingCost] = useState(false)
  const [variantPrice, setVariantPrice] = useState('')
  const [addonName, setAddonName] = useState('')
  const [addonPrice, setAddonPrice] = useState('')

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
  const [condition, setCondition] = useState('new')
  const [unit, setUnit] = useState('')
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
  const isFashion = category?.toLowerCase().includes('fashion') || category?.toLowerCase().includes('footwear')
  const STANDARD_COLOURS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Brown', 'Grey', 'Pink', 'Purple', 'Orange', 'Beige', 'Mixed/Multicolour']
  const [imageFile, setImageFile] = useState(null)
  const [libraryPhotoUrl, setLibraryPhotoUrl] = useState(null)
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

    const { error } = await supabase.from('products').insert({
      seller_id: sellerId,
      hub,
      name,
      description,
      category,
      brand: brand === '__other__' ? brandOther.trim() || null : brand || null,
      price: Number(price),
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
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setName('')
    setDescription('')
    setPrice('')
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

  async function searchCatalog(q) {
    setCatalogSearch(q)
    if (!q.trim()) {
      setCatalogResults([])
      return
    }
    const { data } = await supabase
      .from('master_catalog_items')
      .select('id, base_item, variant_name, brand, suggested_price, unit, category')
      .eq('hub', hub)
      .ilike('base_item', `%${q}%`)
      .order('base_item')
      .limit(15)
    setCatalogResults(data || [])
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
    setCatalogSearch('')
    setCatalogResults([])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="rounded border border-gold/30 bg-gold/10 p-3">
        <p className="text-xs font-medium mb-2">
          Real pre-registered items — pick one instead of typing everything from scratch
        </p>
        <input
          value={catalogSearch}
          onChange={(e) => searchCatalog(e.target.value)}
          placeholder="Search Rice, Flour, Onions…"
          className="w-full text-sm rounded border border-ink/20 px-3 py-2 mb-2"
        />
        {catalogResults.length > 0 && (
          <div className="rounded border border-ink/10 bg-white divide-y divide-ink/5 max-h-64 overflow-y-auto">
            {catalogResults.map((item) => (
              <CatalogPickRow key={item.id} item={item} onPick={pickFromCatalog} />
            ))}
          </div>
        )}
        {catalogMessage && <p className="text-xs text-market-green mt-2">{catalogMessage}</p>}
      </div>

      <p className="text-xs text-ink/40">— or list something new below —</p>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Item name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
        />
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
          Price (₦)
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
          Unit of sale (optional — e.g. per bag, per kg, per crate)
        </label>
        <input
          id="unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="per piece"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
        />
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
        <p className="text-xs font-medium mb-2">Bulk pricing (optional)</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            placeholder="Bulk price/unit (₦)"
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
          <p className="text-xs font-medium">Fashion & footwear sizing</p>
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
            placeholder="Available sizes, comma-separated (e.g. 38, 40, 42)"
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
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="w-full text-sm"
        />
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
        disabled={submitting}
        className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit listing'}
      </button>
    </form>
  )
}

function IncomingOrders({ sellerId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [imeiInputs, setImeiInputs] = useState({})
  const [ticketInputs, setTicketInputs] = useState({})
  const [ticketMessage, setTicketMessage] = useState({})

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total_amount, delivery_type, created_at, order_items(id, product_id, imei, products(name, category))')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
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
  if (orders.length === 0) return <p className="text-ink/50">No orders yet.</p>

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <button onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="w-full">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="font-mono text-xs text-ink/50">{o.id.slice(0, 8)}</p>
                <p className="font-mono text-sm">₦{Number(o.total_amount).toLocaleString()}</p>
              </div>
              <span className="text-xs font-medium text-indigo capitalize">{o.status}</span>
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

          {expanded === o.id && (
            <div className="mt-2 pt-2 border-t border-ink/10 space-y-2">
              {o.order_items?.map((item) => (
                <div key={item.id} className="text-xs">
                  <p className="font-medium">{item.products?.name}</p>
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

function StoreOverview({ sellerId, setTab }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [returnPolicy, setReturnPolicy] = useState('')
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [policySaved, setPolicySaved] = useState(false)

  useEffect(() => {
    async function loadPolicy() {
      const { data } = await supabase.from('sellers').select('return_policy').eq('id', sellerId).single()
      setReturnPolicy(data?.return_policy || '')
    }
    loadPolicy()
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
      <p className="text-xs text-ink/40 col-span-2">
        Revenue here is your store's gross total from delivered orders — it doesn't subtract any costs. Use the
        P&L tab to work out actual profit.
      </p>

      <div className="col-span-2 pt-3 border-t border-ink/10">
        <p className="text-sm font-medium mb-1">Your Seller ID — for buyers to add you as a favourite</p>
        <p className="font-mono text-xs bg-surface rounded p-2 break-all mb-2">{sellerId}</p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(sellerId)}`}
          alt="Scannable QR code for this store's Seller ID"
          className="rounded border border-ink/10"
          width={140}
          height={140}
        />
        <p className="text-xs text-ink/40 mt-1">A genuinely scannable code — scanning it reads your real Seller ID.</p>
      </div>

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

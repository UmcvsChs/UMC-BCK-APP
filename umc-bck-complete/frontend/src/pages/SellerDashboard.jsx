import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { queueSale, getQueuedSales, removeQueuedSale, markQueuedSaleFailed } from '../lib/offlineQueue'

const CATEGORIES_BY_HUB = {
  general_marketplace: [
    'Grains & staples', 'Oils & fats', 'Dairy & beverages',
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
  ],
  canteen: ['Nigerian Meals', 'Northern Dishes', 'Fast Food', 'Shawarma', 'Suya & Grills', 'Pizza', 'Cakes & Desserts', 'Drinks'],
  phones_tech: ['New Phones', 'Accessories', 'Laptops & Tablets', 'Internet Gear'],
  gold_jewelry: ['Pure Gold & Precious Metals', 'Fashion & Costume Jewelry'],
  automobile: ['Vehicles', 'Parts & Accessories'],
  pharma_medical: ['Equipment', 'Personal Care'],
}

// Real mapping from display category name to the slug key used in
// category_brands — the table already existed with real seeded brand
// data, but nothing in the frontend ever queried it until now.
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

    // Real gap fixed: an attendant was never able to reach any working
    // dashboard, because this only ever checked ownership. An attendant
    // isn't sellers.user_id — they're linked through a separate real
    // attendants row. Load those stores too, tagged with the real role,
    // so the dashboard can show an owner the full picture and an
    // attendant a real, focused view of just what they need.
    const { data: attendantLinks } = await supabase
      .from('attendants')
      .select('store_id, sellers(*, primary_hub)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const ownedTagged = (owned || []).map((s) => ({ ...s, myRole: 'owner' }))
    const attendantTagged = (attendantLinks || [])
      .filter((a) => a.sellers)
      .map((a) => ({ ...a.sellers, myRole: 'attendant' }))

    const combined = [...ownedTagged, ...attendantTagged]
    setStores(combined)
    if (combined.length > 0 && !selectedStoreId) setSelectedStoreId(combined[0].id)
    setLoading(false)
  }

  useEffect(() => {
    loadStores()
  }, [])

  useEffect(() => {
    const current = stores.find((s) => s.id === selectedStoreId) || stores[0]
    if (current?.myRole === 'attendant' && tab === 'overview') {
      setTab('register')
    }
  }, [selectedStoreId, stores])

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
        <p className="text-ink/60 mb-3">You don't have a store yet, and you're not currently an active attendant anywhere.</p>
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
              {s.store_name} {s.myRole === 'attendant' && '(attendant)'}
            </button>
          ))}
        </div>
      )}

      {stores.some((s) => s.myRole === 'owner') && (
        <Link to="/seller/register" className="block text-xs text-indigo font-medium mb-3">
          + Add another store
        </Link>
      )}

      {myRole === 'attendant' && (
        <div className="mb-3 rounded bg-gold/10 border border-gold/30 px-3 py-2 text-xs text-gold-dark">
          You're an attendant here, not the owner — you can record sales and send requests, but store settings and
          listings are the director's to manage.
        </div>
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
        {(myRole === 'attendant'
          ? ['register', 'restock', 'creditreqs', 'messages']
          : [
              'overview', 'listings', 'add', 'orders', 'register', 'reports', 'restock', 'creditreqs', 'messages',
              ...(stores.filter((s) => s.myRole === 'owner').length > 1 ? ['addstock'] : []),
              'tradeins', 'attendants', 'pl', 'featured',
            ]
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {t === 'addstock' ? '📦 Add Stock' : t === 'overview' ? 'Overview' : t === 'add' ? 'Add listing' : t === 'listings' ? 'My listings' : t === 'register' ? 'Register' : t === 'reports' ? 'Reports' : t === 'restock' ? 'Restock' : t === 'creditreqs' ? 'Credit Requests' : t === 'messages' ? 'Messages' : t === 'tradeins' ? 'Trade-ins' : t === 'attendants' ? 'Attendants' : t === 'pl' ? 'P&L' : t === 'featured' ? 'Featured' : 'Incoming orders'}
          </button>
        ))}
      </div>

      {tab === 'overview' && <StoreOverview key={store.id} sellerId={store.id} setTab={setTab} />}
      {tab === 'listings' && <MyListings key={store.id} sellerId={store.id} />}
      {tab === 'add' && (
        <AddListing key={store.id} sellerId={store.id} hub={store.primary_hub} approved={store.verification_status === 'approved'} />
      )}
      {tab === 'orders' && <IncomingOrders key={store.id} sellerId={store.id} />}
      {tab === 'tradeins' && <TradeInOffers key={store.id} sellerId={store.id} />}
      {tab === 'attendants' && <Attendants key={store.id} sellerId={store.id} />}
      {tab === 'addstock' && <AddStockAcrossStores stores={stores} />}
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

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, category, status')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
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
            </div>
            <div className="text-right">
              {p.price != null && <p className="font-mono text-sm">₦{Number(p.price).toLocaleString()}</p>}
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
  const [bulkMinQuantity, setBulkMinQuantity] = useState('')
  const [sizeType, setSizeType] = useState('')
  const [availableSizes, setAvailableSizes] = useState('')
  const [availableColours, setAvailableColours] = useState([])
  const isFashion = category?.toLowerCase().includes('fashion') || category?.toLowerCase().includes('footwear')
  const STANDARD_COLOURS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Brown', 'Grey', 'Pink', 'Purple', 'Orange', 'Beige', 'Mixed/Multicolour']
  const [imageFile, setImageFile] = useState(null)
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
    if (imageFile) {
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
          <option value="foreign_used_tokunbo">Foreign used (Tokunbo)</option>
          <option value="refurbished">Refurbished</option>
        </select>
      </div>

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

      <div>
        <label htmlFor="image" className="block text-sm font-medium mb-1">
          Photo
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
      {success && <p className="text-sm text-market-green">Listing submitted for review.</p>}

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

function Attendants({ sellerId }) {
  const [attendants, setAttendants] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newCode, setNewCode] = useState(null)

  async function load() {
    const [{ data: att }, { data: inv }] = await Promise.all([
      supabase.from('attendants').select('id, is_active, created_at').eq('store_id', sellerId),
      supabase.from('attendant_invites').select('id, code, used_by, created_at').eq('store_id', sellerId).order('created_at', { ascending: false }),
    ])
    setAttendants(att || [])
    setInvites(inv || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function generateInvite() {
    setGenerating(true)
    const { data, error } = await supabase.rpc('create_attendant_invite', { p_store_id: sellerId })
    setGenerating(false)
    if (error) {
      alert(error.message)
      return
    }
    setNewCode(data)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>

  return (
    <div>
      <p className="text-sm text-ink/60 mb-3">
        Generate a code and share it with your attendant — they enter it themselves once they have an account.
      </p>

      <button
        onClick={generateInvite}
        disabled={generating}
        className="w-full mb-4 rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
      >
        {generating ? 'Generating…' : 'Generate invite code'}
      </button>

      {newCode && (
        <p className="text-center font-mono text-lg text-indigo mb-4 bg-indigo/5 rounded py-2">{newCode}</p>
      )}

      <p className="text-xs font-medium text-ink/50 mb-2">Active attendants ({attendants.filter((a) => a.is_active).length})</p>

      {invites.length > 0 && (
        <div className="space-y-1">
          {invites.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-xs rounded border border-ink/10 bg-surface px-3 py-2">
              <span className="font-mono">{i.code}</span>
              <span className={i.used_by ? 'text-market-green' : 'text-gold-dark'}>
                {i.used_by ? 'Redeemed' : 'Unused'}
              </span>
            </div>
          ))}
        </div>
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

function SalesRegister({ sellerId }) {
  const [cart, setCart] = useState([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [manualSearch, setManualSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customQty, setCustomQty] = useState('1')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [debtorName, setDebtorName] = useState('')
  const [debtorPhone, setDebtorPhone] = useState('')
  const [depositPaid, setDepositPaid] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [recentSales, setRecentSales] = useState([])
  const [receivables, setReceivables] = useState([])
  const [markingPaid, setMarkingPaid] = useState(null)
  const [queuedSales, setQueuedSales] = useState([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceParsing, setVoiceParsing] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const [voicePendingItems, setVoicePendingItems] = useState([])
  const [isOwner, setIsOwner] = useState(null)

  useEffect(() => {
    loadRecent()
    refreshQueue()
    checkOwnership()

    function handleOnline() {
      setIsOnline(true)
      syncQueue()
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [sellerId])

  async function refreshQueue() {
    const queued = await getQueuedSales().catch(() => [])
    setQueuedSales(queued.filter((q) => q.sellerId === sellerId))
  }

  // Real ownership check — determines whether a credit sale goes straight
  // through, or needs a real approval request first. Not assumed from
  // context; checked directly against the real sellers row.
  async function checkOwnership() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('sellers').select('user_id').eq('id', sellerId).single()
    setIsOwner(data?.user_id === user.id)
  }

  // Real sync — replays each queued sale through the exact same real RPC
  // calls a normal, online sale uses. A genuine business-logic failure
  // (like real insufficient stock, if something sold out online while this
  // device was offline) is kept and marked failed for the seller to
  // review, not silently dropped or silently retried forever.
  async function syncQueue() {
    const queued = await getQueuedSales().catch(() => [])
    const mine = queued.filter((q) => q.sellerId === sellerId && q.status === 'pending')
    if (mine.length === 0) return
    setSyncing(true)
    for (const q of mine) {
      try {
        const { error } =
          q.paymentMethod === 'credit'
            ? await supabase.rpc('record_credit_sale', {
                p_seller_id: q.sellerId,
                p_product_id: q.productId,
                p_item_name: q.itemName,
                p_quantity: q.quantity,
                p_unit_price: q.unitPrice,
                p_debtor_name: q.debtorName,
                p_debtor_phone: q.debtorPhone,
              })
            : await supabase.rpc('record_walk_in_sale', {
                p_seller_id: q.sellerId,
                p_product_id: q.productId,
                p_item_name: q.itemName,
                p_quantity: q.quantity,
                p_unit_price: q.unitPrice,
                p_payment_method: q.paymentMethod,
                p_scanned_by_barcode: q.scannedByBarcode,
              })
        if (error) {
          await markQueuedSaleFailed(q.id, error.message)
        } else {
          await removeQueuedSale(q.id)
        }
      } catch {
        // Genuine network failure mid-sync — leave it queued, try again
        // next time connectivity returns.
      }
    }
    setSyncing(false)
    refreshQueue()
    loadRecent()
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('sales_register_entries')
      .select('id, item_name, quantity, unit_price, line_total, payment_method, created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(10)
    setRecentSales(data || [])

    const { data: owed } = await supabase
      .from('credit_sale_receivables')
      .select('id, debtor_name, debtor_phone, amount_owed, created_at')
      .eq('seller_id', sellerId)
      .eq('is_paid', false)
      .order('created_at', { ascending: false })
    setReceivables(owed || [])
  }

  async function markPaid(receivableId) {
    setMarkingPaid(receivableId)
    const { error } = await supabase.rpc('mark_receivable_paid', { p_receivable_id: receivableId })
    setMarkingPaid(null)
    if (error) {
      alert(error.message)
      return
    }
    loadRecent()
  }

  async function lookupBarcode(decodedText) {
    setScanError(null)
    const { data, error } = await supabase.rpc('find_product_by_barcode', { p_seller_id: sellerId, p_barcode: decodedText })
    if (error || !data || data.length === 0) {
      setScanError(`No product found for barcode ${decodedText} — add it manually below, or record its barcode on the listing first.`)
      return
    }
    const product = data[0]
    addToCart({
      product_id: product.id,
      item_name: product.name,
      unit_price: Number(product.price),
      quantity: 1,
      scanned_by_barcode: true,
    })
  }

  function addToCart(line) {
    setCart((prev) => [...prev, { ...line, key: `${Date.now()}-${Math.random()}` }])
  }

  // Real browser Web Speech API — free, client-side, no server round-trip
  // for transcription itself. Turning that raw speech into structured line
  // items is a separate, real step that needs actual language
  // understanding — handled by parseVoiceTranscript() below, which calls a
  // real Edge Function.
  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError('Voice input isn\u2019t supported in this browser — add items manually instead.')
      return
    }
    setVoiceError(null)
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-NG'
    recognition.continuous = true
    recognition.onstart = () => setListening(true)
    recognition.onend = () => {
      setListening(false)
      if (voiceTranscript.trim()) parseVoiceTranscript()
    }
    recognition.onresult = (e) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript + ' '
      setVoiceTranscript(transcript.trim())
    }
    recognition.start()
  }

  // Real AI parsing — the natural-language step. Never adds anything
  // straight to the cart on its own; results land in a review list first,
  // since a cashier's voice getting misheard with real money on the line
  // is a real risk, not a hypothetical one.
  async function parseVoiceTranscript() {
    setVoiceParsing(true)
    setVoiceError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-voice-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transcript: voiceTranscript }),
      })
      const result = await res.json()
      if (!res.ok) {
        setVoiceError(result.error || 'Could not parse that — try again or add items manually.')
        return
      }
      setVoicePendingItems(
        (result.items || []).map((it) => ({ ...it, key: `${Date.now()}-${Math.random()}`, unit_price: it.unit_price ?? '' }))
      )
    } catch (err) {
      setVoiceError(`Could not reach the parsing service: ${err.message}`)
    }
    setVoiceParsing(false)
  }

  function confirmVoiceItem(item) {
    if (!item.unit_price || Number(item.unit_price) <= 0) return
    addToCart({
      product_id: null,
      item_name: item.item_name,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity) || 1,
      scanned_by_barcode: false,
    })
    setVoicePendingItems((prev) => prev.filter((i) => i.key !== item.key))
  }

  async function searchCatalog(q) {
    setManualSearch(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    const { data } = await supabase
      .from('products')
      .select('id, name, price, unit, stock_quantity')
      .eq('seller_id', sellerId)
      .eq('status', 'live')
      .ilike('name', `%${q}%`)
      .limit(8)
    setSearchResults(data || [])
  }

  function addCustomItem() {
    if (!customName.trim() || !customPrice || Number(customPrice) <= 0) return
    addToCart({
      product_id: null,
      item_name: customName.trim(),
      unit_price: Number(customPrice),
      quantity: Number(customQty) || 1,
      scanned_by_barcode: false,
    })
    setCustomName('')
    setCustomPrice('')
    setCustomQty('1')
  }

  function removeFromCart(key) {
    setCart((prev) => prev.filter((l) => l.key !== key))
  }

  const cartTotal = cart.reduce((sum, l) => sum + l.unit_price * l.quantity, 0)

  async function completeSale() {
    if (cart.length === 0) return
    if (paymentMethod === 'credit' && !debtorName.trim()) {
      setMessage('Enter who owes this — a credit sale needs a real name to track.')
      return
    }
    setSubmitting(true)
    setMessage(null)

    if (!navigator.onLine) {
      // Genuinely offline — queue on-device, don't pretend the sale is
      // confirmed with the platform yet. Syncs automatically the moment
      // connectivity returns.
      for (const line of cart) {
        await queueSale({
          sellerId,
          productId: line.product_id,
          itemName: line.item_name,
          quantity: line.quantity,
          unitPrice: line.unit_price,
          paymentMethod,
          scannedByBarcode: line.scanned_by_barcode,
          debtorName: paymentMethod === 'credit' ? debtorName.trim() : null,
          debtorPhone: paymentMethod === 'credit' ? debtorPhone.trim() || null : null,
        })
      }
      setMessage(`No connection — queued ₦${cartTotal.toLocaleString()} to sync automatically once you're back online.`)
      setCart([])
      setDebtorName('')
      setDebtorPhone('')
      setDepositPaid('')
      refreshQueue()
      setSubmitting(false)
      return
    }

    try {
      for (const line of cart) {
        const { error } =
          paymentMethod === 'credit'
            ? isOwner
              ? await supabase.rpc('record_credit_sale', {
                  p_seller_id: sellerId,
                  p_product_id: line.product_id,
                  p_item_name: line.item_name,
                  p_quantity: line.quantity,
                  p_unit_price: line.unit_price,
                  p_debtor_name: debtorName.trim(),
                  p_debtor_phone: debtorPhone.trim() || null,
                  p_deposit_paid: Number(depositPaid) || 0,
                })
              : await supabase.rpc('submit_credit_sale_request', {
                  p_seller_id: sellerId,
                  p_product_id: line.product_id,
                  p_item_name: line.item_name,
                  p_quantity: line.quantity,
                  p_unit_price: line.unit_price,
                  p_debtor_name: debtorName.trim(),
                  p_debtor_phone: debtorPhone.trim() || null,
                  p_deposit_paid: Number(depositPaid) || 0,
                })
            : await supabase.rpc('record_walk_in_sale', {
                p_seller_id: sellerId,
                p_product_id: line.product_id,
                p_item_name: line.item_name,
                p_quantity: line.quantity,
                p_unit_price: line.unit_price,
                p_payment_method: paymentMethod,
                p_scanned_by_barcode: line.scanned_by_barcode,
              })
        if (error) throw error
      }
      setMessage(
        paymentMethod === 'credit'
          ? isOwner
            ? `Credit sale recorded — ₦${cartTotal.toLocaleString()} owed by ${debtorName.trim()}.`
            : `Sent for approval — ₦${cartTotal.toLocaleString()} owed by ${debtorName.trim()}, pending the store owner's sign-off.`
          : `Sale recorded — ₦${cartTotal.toLocaleString()} (${paymentMethod}).`
      )
      setCart([])
      setDebtorName('')
      setDebtorPhone('')
      setDepositPaid('')
      loadRecent()
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setSubmitting(false)
  }

  useEffect(() => {
    if (!scannerOpen) return
    let html5QrCode
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      html5QrCode = new Html5Qrcode('barcode-reader')
      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            lookupBarcode(decodedText)
            html5QrCode.stop().catch(() => {})
            setScannerOpen(false)
          },
          () => {}
        )
        .catch(() => setScanError('Could not access the camera — check permissions, or add the item manually below.'))
    })
    return () => {
      if (html5QrCode) html5QrCode.stop().catch(() => {})
    }
  }, [scannerOpen])

  return (
    <div>
      {!isOnline && (
        <div className="mb-3 rounded bg-market-red/10 border border-market-red/30 px-3 py-2 text-xs text-market-red">
          No connection right now — sales will be queued on this device and sync automatically once you're back
          online. Don't go more than 24 hours without connecting, or queued sales stay unrecorded with UMC-BCK.
        </div>
      )}
      {queuedSales.length > 0 && (
        <div className="mb-3 rounded bg-gold/10 border border-gold/30 px-3 py-2 text-xs">
          <p className="font-medium">
            {syncing ? 'Syncing…' : `${queuedSales.filter((q) => q.status === 'pending').length} sale(s) waiting to sync`}
          </p>
          {queuedSales.some(
            (q) => q.status === 'pending' && Date.now() - new Date(q.queued_at).getTime() > 24 * 60 * 60 * 1000
          ) && (
            <p className="text-market-red font-medium mt-1">
              ⚠ Some queued sales are over 24 hours old — connect to the internet now to sync them.
            </p>
          )}
          {queuedSales.some((q) => q.status === 'failed') && (
            <div className="mt-1">
              <p className="text-market-red font-medium">
                {queuedSales.filter((q) => q.status === 'failed').length} queued sale(s) failed to sync and need review:
              </p>
              {queuedSales
                .filter((q) => q.status === 'failed')
                .map((q) => (
                  <p key={q.id} className="text-ink/60">
                    {q.itemName} × {q.quantity} — {q.failure_reason}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-ink/50 mb-3">
        Record a real walk-in sale — cash or transfer, paid directly to you, not through the UMC-BCK wallet. Stock
        decreases here exactly the same way it does for an online order.
      </p>

      <button
        onClick={() => setScannerOpen((v) => !v)}
        className="w-full mb-2 text-sm bg-indigo text-white rounded py-2.5"
      >
        {scannerOpen ? 'Close scanner' : '📷 Scan a barcode'}
      </button>
      {scannerOpen && <div id="barcode-reader" className="mb-3 rounded overflow-hidden" />}
      {scanError && <p className="text-xs text-market-red mb-3">{scanError}</p>}

      <button
        onClick={startVoiceInput}
        disabled={listening || voiceParsing}
        className="w-full mb-2 text-sm bg-gold text-ink rounded py-2.5 disabled:opacity-60"
      >
        {listening ? '🎙️ Listening… tap when done' : voiceParsing ? 'Understanding what you said…' : '🎙️ Speak the sale'}
      </button>
      {voiceTranscript && !listening && (
        <p className="text-xs text-ink/50 mb-2 italic">"{voiceTranscript}"</p>
      )}
      {voiceError && <p className="text-xs text-market-red mb-3">{voiceError}</p>}
      {voicePendingItems.length > 0 && (
        <div className="mb-3 rounded border border-gold/30 bg-gold/10 p-3">
          <p className="text-xs font-medium mb-2">Confirm what was heard before adding to cart</p>
          {voicePendingItems.map((item) => (
            <div key={item.key} className="flex items-center gap-1 mb-1">
              <span className="text-sm flex-1">{item.item_name}</span>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  setVoicePendingItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, quantity: e.target.value } : i)))
                }
                className="w-14 text-xs rounded border border-ink/20 px-1 py-1"
              />
              <input
                type="number"
                placeholder="₦ price"
                value={item.unit_price}
                onChange={(e) =>
                  setVoicePendingItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, unit_price: e.target.value } : i)))
                }
                className="w-20 text-xs rounded border border-ink/20 px-1 py-1"
              />
              <button onClick={() => confirmVoiceItem(item)} className="text-xs bg-market-green text-white rounded px-2 py-1">
                Add
              </button>
              <button
                onClick={() => setVoicePendingItems((prev) => prev.filter((i) => i.key !== item.key))}
                className="text-xs text-market-red"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3">
        <input
          value={manualSearch}
          onChange={(e) => searchCatalog(e.target.value)}
          placeholder="Search your catalog to add manually"
          className="w-full text-sm rounded border border-ink/20 px-3 py-2"
        />
        {searchResults.length > 0 && (
          <div className="mt-1 rounded border border-ink/10 bg-surface divide-y divide-ink/5">
            {searchResults.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 hover:bg-paper">
                <button
                  onClick={() => {
                    addToCart({ product_id: p.id, item_name: p.name, unit_price: Number(p.price), quantity: 1, scanned_by_barcode: false })
                    setManualSearch('')
                    setSearchResults([])
                  }}
                  className="text-left text-sm flex-1"
                >
                  {p.name} — ₦{Number(p.price).toLocaleString()} <span className="text-xs text-ink/40">({p.stock_quantity} in stock)</span>
                </button>
                <button
                  onClick={async () => {
                    const suggestedQty = window.prompt(`Suggested restock quantity for ${p.name}? (optional)`)
                    const { error } = await supabase.rpc('submit_restock_request', {
                      p_seller_id: sellerId,
                      p_product_id: p.id,
                      p_suggested_quantity: suggestedQty ? Number(suggestedQty) : null,
                    })
                    if (error) alert(error.message)
                    else alert(`Flagged ${p.name} for restock.`)
                  }}
                  className="text-xs text-gold-dark shrink-0 ml-2"
                  title="Flag low stock"
                >
                  ⚠ Flag
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded border border-ink/10 bg-surface p-3 mb-3">
        <p className="text-xs font-medium mb-2">Not in your catalog? Add a custom item</p>
        <div className="grid grid-cols-3 gap-2">
          <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Item" className="col-span-3 text-sm rounded border border-ink/20 px-2 py-1" />
          <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="₦ price" className="text-sm rounded border border-ink/20 px-2 py-1" />
          <input type="number" value={customQty} onChange={(e) => setCustomQty(e.target.value)} placeholder="Qty" className="text-sm rounded border border-ink/20 px-2 py-1" />
          <button onClick={addCustomItem} className="text-xs bg-gold text-ink rounded px-2">Add</button>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium mb-1">Cart</p>
        {cart.length === 0 && <p className="text-xs text-ink/50">Empty — scan, search, or add a custom item.</p>}
        {cart.map((l) => (
          <div key={l.key} className="flex items-center justify-between text-sm py-1 border-b border-ink/5">
            <span>
              {l.item_name} × {l.quantity} {l.scanned_by_barcode && '📷'}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-mono">₦{(l.unit_price * l.quantity).toLocaleString()}</span>
              <button onClick={() => removeFromCart(l.key)} className="text-xs text-market-red">✕</button>
            </span>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <>
          <div className="flex items-center justify-between font-medium mb-2">
            <span>Total</span>
            <span className="font-mono text-lg text-indigo">₦{cartTotal.toLocaleString()}</span>
          </div>
          <div className="flex gap-2 mb-3">
            {['cash', 'transfer', 'credit'].map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 text-sm rounded py-2 capitalize ${paymentMethod === m ? 'bg-indigo text-white' : 'bg-surface border border-ink/20'}`}
              >
                {m}
              </button>
            ))}
          </div>
          {paymentMethod === 'credit' && (
            <div className="mb-3 rounded border border-gold/30 bg-gold/10 p-3 space-y-2">
              <p className="text-xs font-medium">Who owes this?</p>
              {isOwner === false && (
                <p className="text-xs text-ink/50">
                  This will go to the store owner for approval before it's recorded — you don't have direct
                  credit-sale authority.
                </p>
              )}
              <input
                value={debtorName}
                onChange={(e) => setDebtorName(e.target.value)}
                placeholder="Name (required)"
                className="w-full text-sm rounded border border-ink/20 px-2 py-1"
              />
              <input
                value={debtorPhone}
                onChange={(e) => setDebtorPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full text-sm rounded border border-ink/20 px-2 py-1"
              />
              <input
                type="number"
                value={depositPaid}
                onChange={(e) => setDepositPaid(e.target.value)}
                placeholder="Deposit paid (₦0 if none)"
                className="w-full text-sm rounded border border-ink/20 px-2 py-1"
              />
            </div>
          )}
          <button onClick={completeSale} disabled={submitting} className="w-full text-sm bg-market-green text-white rounded py-2.5 disabled:opacity-60">
            {submitting ? 'Recording…' : 'Complete sale'}
          </button>
        </>
      )}

      {message && <p className="text-xs mt-2 text-market-green">{message}</p>}

      {receivables.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium mb-2">Outstanding credit (₦{receivables.reduce((s, r) => s + Number(r.amount_owed), 0).toLocaleString()} total)</p>
          <div className="space-y-1">
            {receivables.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm rounded border border-ink/10 bg-surface px-3 py-2">
                <div>
                  <p>{r.debtor_name}</p>
                  {r.debtor_phone && <p className="text-xs text-ink/40">{r.debtor_phone}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-market-red">₦{Number(r.amount_owed).toLocaleString()}</span>
                  <button
                    onClick={() => markPaid(r.id)}
                    disabled={markingPaid === r.id}
                    className="text-xs bg-market-green text-white rounded px-2 py-1 disabled:opacity-60"
                  >
                    {markingPaid === r.id ? '…' : 'Mark paid'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium mb-2">Recent walk-in sales</p>
        {recentSales.length === 0 && <p className="text-xs text-ink/50">None recorded yet.</p>}
        {recentSales.map((s) => (
          <div key={s.id} className="text-xs text-ink/60 flex justify-between py-1 border-b border-ink/5">
            <span>{s.item_name} × {s.quantity} ({s.payment_method})</span>
            <span className="font-mono">₦{Number(s.line_total).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SalesReports({ sellerId }) {
  const [range, setRange] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [itemResults, setItemResults] = useState([])
  const [itemSummary, setItemSummary] = useState(null)

  function getDateRange() {
    const today = new Date()
    const toStr = today.toISOString().slice(0, 10)
    let from = new Date(today)
    if (range === 'today') {
      // from = today
    } else if (range === '7d') {
      from.setDate(from.getDate() - 7)
    } else if (range === '30d') {
      from.setDate(from.getDate() - 30)
    } else if (range === 'quarter') {
      from.setMonth(from.getMonth() - 3)
    } else if (range === '6m') {
      from.setMonth(from.getMonth() - 6)
    } else if (range === 'year') {
      from.setFullYear(from.getFullYear() - 1)
    } else if (range === 'custom') {
      return { from: customFrom, to: customTo }
    }
    return { from: from.toISOString().slice(0, 10), to: toStr }
  }

  async function runReport() {
    const { from, to } = getDateRange()
    if (!from || !to) return
    setLoading(true)
    const { data, error } = await supabase.rpc('get_sales_report', {
      p_seller_id: sellerId,
      p_from_date: from,
      p_to_date: to,
    })
    setLoading(false)
    if (error) {
      alert(error.message)
      return
    }
    setReport(data?.[0] || null)
  }

  useEffect(() => {
    if (range !== 'custom') runReport()
  }, [range])

  async function searchItems(q) {
    setItemSearch(q)
    setItemSummary(null)
    if (!q.trim()) {
      setItemResults([])
      return
    }
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('seller_id', sellerId)
      .ilike('name', `%${q}%`)
      .limit(8)
    setItemResults(data || [])
  }

  async function checkItem(productId) {
    const { from, to } = getDateRange()
    const { data, error } = await supabase.rpc('get_item_sales_summary', {
      p_seller_id: sellerId,
      p_product_id: productId,
      p_from_date: from,
      p_to_date: to,
    })
    if (error) {
      alert(error.message)
      return
    }
    setItemSummary(data?.[0] || null)
    setItemResults([])
  }

  const RANGES = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'quarter', label: 'Quarter' },
    { value: '6m', label: '6 months' },
    { value: 'year', label: 'Year' },
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <div>
      <p className="text-xs text-ink/50 mb-3">
        Real numbers, combining online orders and walk-in Register sales for this store — not two separate pictures.
      </p>

      <div className="flex flex-wrap gap-1 mb-3">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`text-xs rounded px-2 py-1 ${range === r.value ? 'bg-indigo text-white' : 'bg-surface border border-ink/20'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {range === 'custom' && (
        <div className="flex gap-2 mb-3">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="flex-1 text-sm rounded border border-ink/20 px-2 py-1" />
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="flex-1 text-sm rounded border border-ink/20 px-2 py-1" />
          <button onClick={runReport} className="text-xs bg-indigo text-white rounded px-3">Run</button>
        </div>
      )}

      {loading && <p className="text-xs text-ink/50">Loading…</p>}

      {report && (
        <div className="rounded border border-ink/10 bg-surface p-3 mb-6 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-ink/50">Online orders</p>
              <p className="font-mono">₦{Number(report.online_total).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Walk-in cash</p>
              <p className="font-mono">₦{Number(report.walk_in_cash).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Walk-in transfer</p>
              <p className="font-mono">₦{Number(report.walk_in_transfer).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Walk-in credit</p>
              <p className="font-mono">₦{Number(report.walk_in_credit).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Credit collected</p>
              <p className="font-mono text-market-green">₦{Number(report.credit_collected).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Credit still owed</p>
              <p className="font-mono text-market-red">₦{Number(report.credit_outstanding).toLocaleString()}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-ink/10">
            <p className="text-xs text-ink/50">Combined total</p>
            <p className="font-mono text-xl text-indigo">₦{Number(report.combined_total).toLocaleString()}</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">Per-item sales — e.g. "how many bags of rice this month"</p>
        <input
          value={itemSearch}
          onChange={(e) => searchItems(e.target.value)}
          placeholder="Search an item"
          className="w-full text-sm rounded border border-ink/20 px-3 py-2"
        />
        {itemResults.length > 0 && (
          <div className="mt-1 rounded border border-ink/10 bg-surface divide-y divide-ink/5">
            {itemResults.map((p) => (
              <button key={p.id} onClick={() => checkItem(p.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-paper">
                {p.name}
              </button>
            ))}
          </div>
        )}
        {itemSummary && (
          <div className="mt-2 rounded border border-ink/10 bg-surface p-3">
            <p className="text-sm font-medium">{itemSummary.item_name}</p>
            <p className="text-xs text-ink/50">
              {itemSummary.online_quantity} sold online + {itemSummary.walk_in_quantity} sold at the register ={' '}
              <span className="font-mono text-indigo">{itemSummary.total_quantity} total</span>
            </p>
            <p className="text-xs text-ink/50">Revenue: ₦{Number(itemSummary.total_revenue).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function RestockRequests({ sellerId }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [newStock, setNewStock] = useState({})
  const [acting, setActing] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('restock_requests')
      .select('id, current_stock_at_request, suggested_quantity, notes, status, created_at, products(name), profiles!restock_requests_requested_by_fkey(full_name)')
      .eq('seller_id', sellerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function resolve(requestId, status) {
    setActing(requestId)
    const { error } = await supabase.rpc('resolve_restock_request', {
      p_request_id: requestId,
      p_status: status,
      p_new_stock_quantity: status === 'restocked' ? Number(newStock[requestId]) : null,
    })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (requests.length === 0) return <p className="text-ink/50 text-sm">No pending restock flags right now.</p>

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/50 mb-2">
        Real flags raised by you or your attendants — resolving as "Restocked" genuinely updates the real stock
        quantity, the same one the online storefront reads from.
      </p>
      {requests.map((r) => (
        <div key={r.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <p className="text-sm font-medium">{r.products?.name}</p>
          <p className="text-xs text-ink/50">
            Was {r.current_stock_at_request} in stock when flagged by {r.profiles?.full_name || 'an attendant'}
            {r.suggested_quantity && <span className="text-gold-dark font-medium"> — suggests restocking {r.suggested_quantity}</span>}
            {r.notes && ` — "${r.notes}"`}
          </p>
          <div className="flex gap-1 mt-2">
            <input
              type="number"
              placeholder="New stock qty"
              value={newStock[r.id] || ''}
              onChange={(e) => setNewStock((prev) => ({ ...prev, [r.id]: e.target.value }))}
              className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
            />
            <button onClick={() => resolve(r.id, 'restocked')} disabled={acting === r.id} className="text-xs bg-market-green text-white rounded px-2 py-1">
              Restocked
            </button>
            <button onClick={() => resolve(r.id, 'acknowledged')} disabled={acting === r.id} className="text-xs bg-gold text-ink rounded px-2 py-1">
              Acknowledge
            </button>
            <button onClick={() => resolve(r.id, 'dismissed')} disabled={acting === r.id} className="text-xs text-market-red">
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CreditSaleRequests({ sellerId }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('credit_sale_requests')
      .select('id, item_name, quantity, unit_price, debtor_name, debtor_phone, created_at, profiles!credit_sale_requests_requested_by_fkey(full_name)')
      .eq('seller_id', sellerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function resolve(requestId, approve) {
    setActing(requestId)
    const { error } = await supabase.rpc('resolve_credit_sale_request', { p_request_id: requestId, p_approve: approve })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (requests.length === 0) return <p className="text-ink/50 text-sm">No pending credit sale requests right now.</p>

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/50 mb-2">
        Real requests from your attendants — approving genuinely records the sale, decrements real stock, and
        creates a real receivable, exactly as if you'd recorded it yourself.
      </p>
      {requests.map((r) => (
        <div key={r.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <p className="text-sm font-medium">
            {r.item_name} × {r.quantity} — <span className="font-mono text-indigo">₦{Number(r.quantity * r.unit_price).toLocaleString()}</span>
          </p>
          <p className="text-xs text-ink/50">
            Owed by {r.debtor_name}{r.debtor_phone && ` (${r.debtor_phone})`} — requested by {r.profiles?.full_name || 'an attendant'}
          </p>
          <div className="flex gap-1 mt-2">
            <button onClick={() => resolve(r.id, true)} disabled={acting === r.id} className="text-xs bg-market-green text-white rounded px-3 py-1">
              Approve
            </button>
            <button onClick={() => resolve(r.id, false)} disabled={acting === r.id} className="text-xs bg-market-red text-white rounded px-3 py-1">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function StoreMessages({ storeId }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [myUserId, setMyUserId] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('store_messages')
      .select('id, message, created_at, sender_id, profiles(full_name)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data?.user?.id || null))
    load()

    // Real-time — messages from the director or any attendant appear
    // live for everyone watching this store's channel.
    const channel = supabase
      .channel(`store-messages-${storeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'store_messages', filter: `store_id=eq.${storeId}` }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    const { error } = await supabase.rpc('send_store_message', { p_store_id: storeId, p_message: text.trim() })
    setSending(false)
    if (error) {
      alert(error.message)
      return
    }
    setText('')
    load()
  }

  return (
    <div>
      <p className="text-xs text-ink/50 mb-3">
        A real, shared channel for this store — the director and every active attendant see the same conversation.
      </p>

      {loading && <p className="text-ink/50">Loading…</p>}

      <div className="space-y-2 mb-3 max-h-96 overflow-y-auto">
        {messages.length === 0 && !loading && <p className="text-xs text-ink/50">No messages yet — say something.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === myUserId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded px-3 py-2 max-w-[80%] ${mine ? 'bg-indigo text-paper' : 'bg-white border border-ink/10'}`}>
                {!mine && <p className="text-xs font-medium text-gold-dark mb-0.5">{m.profiles?.full_name || 'Team member'}</p>}
                <p className="text-sm">{m.message}</p>
                <p className={`text-xs mt-0.5 ${mine ? 'text-paper/60' : 'text-ink/40'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the team…"
          className="flex-1 text-sm rounded border border-ink/20 px-3 py-2"
        />
        <button type="submit" disabled={sending} className="text-sm bg-indigo text-white rounded px-4 disabled:opacity-60">
          {sending ? '…' : 'Send'}
        </button>
      </form>
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

function AddStockAcrossStores({ stores }) {
  const ownedStores = stores.filter((s) => s.myRole === 'owner')
  const [myProducts, setMyProducts] = useState([])
  const [sourceProductId, setSourceProductId] = useState('')
  const [targetSellerId, setTargetSellerId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [movements, setMovements] = useState([])

  async function loadProducts() {
    const ids = ownedStores.map((s) => s.id)
    const { data } = await supabase.from('products').select('id, name, seller_id').in('seller_id', ids).order('name')
    setMyProducts(data || [])
  }

  async function loadMovements() {
    const { data } = await supabase
      .from('stock_movements')
      .select('item_name, quantity_added, created_at, sellers!stock_movements_target_seller_id_fkey(store_name)')
      .order('created_at', { ascending: false })
      .limit(10)
    setMovements(data || [])
  }

  useEffect(() => {
    loadProducts()
    loadMovements()
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!sourceProductId || !targetSellerId || !quantity) return
    setSubmitting(true)
    setMessage(null)
    const { error } = await supabase.rpc('add_stock_to_store', {
      p_source_product_id: sourceProductId,
      p_target_seller_id: targetSellerId,
      p_quantity: Number(quantity),
    })
    setSubmitting(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Stock added — no re-upload needed.')
    setSourceProductId('')
    setTargetSellerId('')
    setQuantity('')
    loadMovements()
  }

  return (
    <div>
      <div className="rounded border border-ink/10 bg-surface p-3 mb-4">
        <p className="text-sm font-medium mb-1">📦 Add stock to a store</p>
        <p className="text-xs text-ink/50 mb-3">
          Select an existing product from your catalogue and add units to a specific store. No re-uploading needed.
        </p>
        <form onSubmit={submit} className="space-y-2">
          <select
            value={sourceProductId}
            onChange={(e) => setSourceProductId(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2"
          >
            <option value="">-- Select product --</option>
            {myProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={targetSellerId}
            onChange={(e) => setTargetSellerId(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2"
          >
            <option value="">-- Add to which store --</option>
            {ownedStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity to add — e.g. 50 bags"
            className="w-full text-sm rounded border border-ink/20 px-3 py-2"
          />
          <button type="submit" disabled={submitting} className="w-full text-sm bg-market-green text-white rounded py-2.5 disabled:opacity-60">
            {submitting ? 'Adding…' : 'Add stock to store'}
          </button>
        </form>
        {message && <p className="text-xs text-ink/60 mt-2">{message}</p>}
      </div>

      <div className="rounded border border-ink/10 bg-surface p-3">
        <p className="text-sm font-medium mb-2">Recent stock movements</p>
        {movements.length === 0 && <p className="text-xs text-ink/50">No stock movements yet</p>}
        {movements.map((m, i) => (
          <div key={i} className="text-xs text-ink/60 flex justify-between py-1.5 border-b border-ink/5">
            <span>{m.item_name} → {m.sellers?.store_name}</span>
            <span className="font-mono">+{m.quantity_added}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES_BY_HUB = {
  general_marketplace: ['Groceries', 'Fashion', 'Electronics', 'Household', 'Beauty & Personal Care', 'Other'],
  canteen: ['Rice & Swallow', 'Soup', 'Protein', 'Sides', 'Drinks', 'Snacks'],
  phones_tech: ['New Phones', 'Accessories', 'Laptops & Tablets', 'Internet Gear'],
  gold_jewelry: ['Pure Gold & Precious Metals', 'Fashion & Costume Jewelry'],
  automobile: ['Vehicles', 'Parts & Accessories'],
  pharma_medical: ['Equipment', 'Personal Care'],
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
    const { data } = await supabase
      .from('sellers')
      .select('*, primary_hub')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    setStores(data || [])
    if (data?.length > 0 && !selectedStoreId) setSelectedStoreId(data[0].id)
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
      </div>
    )
  }

  const store = stores.find((s) => s.id === selectedStoreId) || stores[0]

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
        {['overview', 'listings', 'add', 'orders', 'tradeins', 'attendants', 'pl', 'featured'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'add' ? 'Add listing' : t === 'listings' ? 'My listings' : t === 'tradeins' ? 'Trade-ins' : t === 'attendants' ? 'Attendants' : t === 'pl' ? 'P&L' : t === 'featured' ? 'Featured' : 'Incoming orders'}
          </button>
        ))}
      </div>

      {tab === 'overview' && <StoreOverview key={store.id} sellerId={store.id} />}
      {tab === 'listings' && <MyListings key={store.id} sellerId={store.id} />}
      {tab === 'add' && (
        <AddListing key={store.id} sellerId={store.id} hub={store.primary_hub} approved={store.verification_status === 'approved'} />
      )}
      {tab === 'orders' && <IncomingOrders key={store.id} sellerId={store.id} />}
      {tab === 'tradeins' && <TradeInOffers key={store.id} sellerId={store.id} />}
      {tab === 'attendants' && <Attendants key={store.id} sellerId={store.id} />}
      {tab === 'pl' && <ProfitLossCalculator />}
      {tab === 'featured' && <FeaturedPlacement key={store.id} sellerId={store.id} />}
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
        <div key={p.id} className="rounded border border-ink/10 bg-white px-3 py-2">
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
          {expanded === p.id && <ManageVariantsAndAddons productId={p.id} />}
        </div>
      ))}
    </div>
  )
}

function ManageVariantsAndAddons({ productId }) {
  const [variants, setVariants] = useState([])
  const [addons, setAddons] = useState([])
  const [variantName, setVariantName] = useState('')
  const [variantPrice, setVariantPrice] = useState('')
  const [addonName, setAddonName] = useState('')
  const [addonPrice, setAddonPrice] = useState('')

  async function load() {
    const [{ data: v }, { data: a }] = await Promise.all([
      supabase.from('product_variants').select('*').eq('product_id', productId),
      supabase.from('product_addons').select('*').eq('product_id', productId),
    ])
    setVariants(v || [])
    setAddons(a || [])
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
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState('new')
  const [imageFile, setImageFile] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
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

    const { error } = await supabase.from('products').insert({
      seller_id: sellerId,
      name,
      description,
      category,
      price: Number(price),
      condition,
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
    setImageFile(null)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Item name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
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
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
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
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

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
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none font-mono"
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
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
        >
          <option value="new">New</option>
          <option value="fairly_used">Fairly used</option>
          <option value="nigerian_used">Nigerian used</option>
          <option value="foreign_used_tokunbo">Foreign used (Tokunbo)</option>
          <option value="refurbished">Refurbished</option>
        </select>
      </div>

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
        <div key={o.id} className="rounded border border-ink/10 bg-white px-3 py-2">
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
        <div key={o.id} className="rounded border border-ink/10 bg-white px-3 py-2">
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
            <div key={i.id} className="flex items-center justify-between text-xs rounded border border-ink/10 bg-white px-3 py-2">
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

function StoreOverview({ sellerId }) {
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
      const [{ data: orders }, { count: listingCount }] = await Promise.all([
        supabase.from('orders').select('status, total_amount').eq('seller_id', sellerId),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId),
      ])

      const delivered = (orders || []).filter((o) => o.status === 'delivered')
      const totalRevenue = delivered.reduce((sum, o) => sum + Number(o.total_amount), 0)

      setStats({
        totalOrders: (orders || []).length,
        deliveredOrders: delivered.length,
        totalRevenue,
        totalListings: listingCount || 0,
      })
      setLoading(false)
    }
    load()
  }, [sellerId])

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (!stats) return null

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded border border-ink/10 bg-white px-3 py-2">
        <p className="text-xs text-ink/50">Total orders</p>
        <p className="text-lg font-display font-semibold text-indigo">{stats.totalOrders}</p>
      </div>
      <div className="rounded border border-ink/10 bg-white px-3 py-2">
        <p className="text-xs text-ink/50">Delivered</p>
        <p className="text-lg font-display font-semibold text-market-green">{stats.deliveredOrders}</p>
      </div>
      <div className="rounded border border-ink/10 bg-white px-3 py-2 col-span-2">
        <p className="text-xs text-ink/50">Revenue from delivered orders</p>
        <p className="font-mono text-xl text-indigo">₦{stats.totalRevenue.toLocaleString()}</p>
      </div>
      <div className="rounded border border-ink/10 bg-white px-3 py-2 col-span-2">
        <p className="text-xs text-ink/50">Total listings</p>
        <p className="text-lg font-display font-semibold text-indigo">{stats.totalListings}</p>
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

function ProfitLossCalculator() {
  const [revenue, setRevenue] = useState('')
  const [costs, setCosts] = useState('')

  const profit = revenue && costs ? Number(revenue) - Number(costs) : null

  return (
    <div className="max-w-sm">
      <p className="text-xs text-ink/50 mb-3">
        A simple calculator — enter your own figures. UMC-BCK doesn't track your cost of goods automatically, since
        that's information only you have.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Revenue (₦)</label>
          <input
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Costs (₦)</label>
          <input
            type="number"
            value={costs}
            onChange={(e) => setCosts(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2 font-mono"
          />
        </div>
        {profit != null && (
          <p className={`text-lg font-display font-semibold ${profit >= 0 ? 'text-market-green' : 'text-market-red'}`}>
            {profit >= 0 ? 'Profit' : 'Loss'}: ₦{Math.abs(profit).toLocaleString()}
          </p>
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
          <div key={t.value} className="rounded border border-ink/10 bg-white px-3 py-2 flex items-center justify-between">
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

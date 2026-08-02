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
  const [store, setStore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('listings')

  useEffect(() => {
    async function loadStore() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // A user can own more than one store (Director role) — this picks the
      // first for now; a real multi-store switcher is a follow-on piece.
      const { data } = await supabase.from('sellers').select('*, primary_hub').eq('user_id', user.id).limit(1).maybeSingle()
      setStore(data)
      setLoading(false)
    }
    loadStore()
  }, [])

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  if (!store) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-ink/60 mb-3">You don't have a store yet.</p>
        <Link to="/seller/register" className="text-indigo font-medium">
          Register your store →
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
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
      <p className="text-sm text-ink/50 mb-6">
        {store.verification_status === 'pending' && 'Your store is awaiting admin review.'}
        {store.verification_status === 'approved' && (store.is_open ? 'Open for orders' : 'Closed')}
        {store.verification_status === 'rejected' && 'This registration was not approved.'}
      </p>

      <div className="flex gap-1 border-b border-ink/10 mb-4">
        {['listings', 'add', 'orders', 'tradeins'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {t === 'add' ? 'Add listing' : t === 'listings' ? 'My listings' : t === 'tradeins' ? 'Trade-ins' : 'Incoming orders'}
          </button>
        ))}
      </div>

      {tab === 'listings' && <MyListings sellerId={store.id} />}
      {tab === 'add' && (
        <AddListing sellerId={store.id} hub={store.primary_hub} approved={store.verification_status === 'approved'} />
      )}
      {tab === 'orders' && <IncomingOrders sellerId={store.id} />}
      {tab === 'tradeins' && <TradeInOffers sellerId={store.id} />}
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

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total_amount, delivery_type, created_at')
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
    await supabase.rpc('confirm_order', { p_order_id: orderId })
    setActioning(null)
    load()
  }

  async function handleReject(orderId) {
    setActioning(orderId)
    await supabase.rpc('reject_order', { p_order_id: orderId, p_reason: 'Declined by seller' })
    setActioning(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (orders.length === 0) return <p className="text-ink/50">No orders yet.</p>

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-ink/50">{o.id.slice(0, 8)}</p>
              <p className="font-mono text-sm">₦{Number(o.total_amount).toLocaleString()}</p>
            </div>
            <span className="text-xs font-medium text-indigo capitalize">{o.status}</span>
          </div>

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
    await supabase.rpc('respond_to_trade_in_offer', {
      p_offer_id: offerId,
      p_action: action,
      p_seller_offer_price: counterPrices[offerId] ? Number(counterPrices[offerId]) : null,
    })
    setActing(null)
    load()
  }

  async function completeBuyback(offerId) {
    setActing(offerId)
    await supabase.rpc('complete_trade_in_cash_buyback', { p_offer_id: offerId })
    setActing(null)
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

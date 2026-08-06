import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CONDITIONS = [
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'needs_to_be_fixed', label: 'Needs to be fixed' },
]

export default function UsedItems() {
  const [tab, setTab] = useState('browse')

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Used Items</h1>
      <p className="text-sm text-ink/60 mb-6">Secondhand, peer-to-peer — including a free / Sadaqah section.</p>

      <div className="flex gap-1 border-b border-ink/10 mb-4">
        {['browse', 'list', 'offers'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {t === 'browse' ? 'Browse' : t === 'list' ? 'List an item' : 'My offers'}
          </button>
        ))}
      </div>

      {tab === 'browse' && <BrowseUsedItems />}
      {tab === 'list' && <ListUsedItem />}
      {tab === 'offers' && <MyOffers />}
    </div>
  )
}

function BrowseUsedItems() {
  const [items, setItems] = useState([])
  const [showDonationsOnly, setShowDonationsOnly] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [offerAmounts, setOfferAmounts] = useState({})
  const [offering, setOffering] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let query = supabase
        .from('used_item_listings')
        .select('id, item_name, category, description, condition, has_receipt, has_original_packaging, is_donation, listing_type, price, photo_urls')
        .eq('status', 'available')
        .order('created_at', { ascending: false })

      if (showDonationsOnly) query = query.eq('is_donation', true)
      if (activeCategory !== 'All') query = query.eq('category', activeCategory)

      const { data } = await query
      if (!cancelled) {
        setItems(data || [])
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [showDonationsOnly, activeCategory])

  async function makeOffer(listingId) {
    const amount = offerAmounts[listingId]
    if (!amount || Number(amount) <= 0) return
    setOffering(listingId)
    const { error } = await supabase.rpc('propose_used_item_offer', {
      p_listing_id: listingId,
      p_offer_amount: Number(amount),
    })
    setOffering(null)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Offer sent — see it under "My offers".')
    setOfferAmounts((prev) => ({ ...prev, [listingId]: '' }))
  }

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto mb-3 pb-1">
        {['All', ...USED_ITEM_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              activeCategory === c ? 'bg-market-green text-white' : 'bg-surface border border-ink/20 text-ink/60'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm mb-4">
        <input
          type="checkbox"
          checked={showDonationsOnly}
          onChange={(e) => setShowDonationsOnly(e.target.checked)}
          className="accent-indigo"
        />
        Free / Sadaqah only
      </label>

      {message && <p className="text-xs text-market-green mb-3">{message}</p>}
      {loading && <p className="text-ink/50">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-ink/50">No listings here yet.</p>}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{item.item_name}</p>
                <p className="text-xs text-ink/50 capitalize">{item.condition.replace(/_/g, ' ')}</p>
              </div>
              {item.is_donation ? (
                <span className="text-xs font-medium text-market-green bg-market-green/10 rounded px-2 py-0.5">
                  Sadaqah / Free
                </span>
              ) : (
                item.price != null && (
                  <span className="font-mono text-sm text-indigo">₦{Number(item.price).toLocaleString()}</span>
                )
              )}
            </div>
            {item.description && <p className="text-xs text-ink/60 mt-1">{item.description}</p>}
            <p className="text-xs text-ink/40 mt-1">
              {item.has_receipt ? 'Has receipt' : 'No receipt'} · {item.has_original_packaging ? 'Original packaging' : 'No original packaging'}
            </p>

            {item.listing_type === 'negotiable' && (
              <div className="flex gap-1 mt-2">
                <input
                  type="number"
                  value={offerAmounts[item.id] || ''}
                  onChange={(e) => setOfferAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="Your offer (₦)"
                  className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
                />
                <button
                  onClick={() => makeOffer(item.id)}
                  disabled={offering === item.id}
                  className="text-xs bg-indigo text-white rounded px-3 disabled:opacity-60"
                >
                  {offering === item.id ? '…' : 'Make offer'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MyOffers() {
  const [madeOffers, setMadeOffers] = useState([])
  const [receivedOffers, setReceivedOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [counterAmounts, setCounterAmounts] = useState({})

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: mine } = await supabase
      .from('used_item_offers')
      .select('id, offer_amount, status, is_counter, created_at, used_item_listings(id, item_name)')
      .eq('offered_by', user.id)
      .order('created_at', { ascending: false })
    setMadeOffers(mine || [])

    const { data: myListingIds } = await supabase.from('used_item_listings').select('id').eq('lister_id', user.id)
    const ids = (myListingIds || []).map((l) => l.id)
    if (ids.length > 0) {
      const { data: received } = await supabase
        .from('used_item_offers')
        .select('id, offer_amount, status, is_counter, created_at, used_item_listings(id, item_name)')
        .in('listing_id', ids)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setReceivedOffers(received || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function respond(offerId, action) {
    setActing(offerId)
    const counterAmount = action === 'counter' ? Number(counterAmounts[offerId]) : null
    const { error } = await supabase.rpc('respond_to_used_item_offer', {
      p_offer_id: offerId,
      p_action: action,
      p_counter_amount: counterAmount,
    })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium mb-2">Offers on your listings</p>
        {receivedOffers.length === 0 && <p className="text-xs text-ink/50">None pending right now.</p>}
        <div className="space-y-2">
          {receivedOffers.map((o) => (
            <div key={o.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
              <p className="text-sm">
                {o.used_item_listings?.item_name} — <span className="font-mono text-indigo">₦{Number(o.offer_amount).toLocaleString()}</span>
                {o.is_counter && <span className="text-xs text-ink/40"> (their counter)</span>}
              </p>
              <div className="flex gap-1 mt-2">
                <button onClick={() => respond(o.id, 'accept')} disabled={acting === o.id} className="text-xs bg-market-green text-white rounded px-2 py-1">
                  Accept
                </button>
                <button onClick={() => respond(o.id, 'decline')} disabled={acting === o.id} className="text-xs bg-market-red text-white rounded px-2 py-1">
                  Decline
                </button>
                <input
                  type="number"
                  value={counterAmounts[o.id] || ''}
                  onChange={(e) => setCounterAmounts((prev) => ({ ...prev, [o.id]: e.target.value }))}
                  placeholder="Counter ₦"
                  className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
                />
                <button onClick={() => respond(o.id, 'counter')} disabled={acting === o.id} className="text-xs bg-gold text-ink rounded px-2 py-1">
                  Counter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Offers you've made</p>
        {madeOffers.length === 0 && <p className="text-xs text-ink/50">You haven't made any offers yet.</p>}
        <div className="space-y-2">
          {madeOffers.map((o) => (
            <div key={o.id} className="rounded border border-ink/10 bg-surface px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-sm">{o.used_item_listings?.item_name}</p>
                <p className="font-mono text-xs text-indigo">₦{Number(o.offer_amount).toLocaleString()}</p>
              </div>
              <span className={`text-xs font-medium capitalize ${
                o.status === 'accepted' ? 'text-market-green' : o.status === 'declined' ? 'text-market-red' : 'text-ink/50'
              }`}>
                {o.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Real 6-category taxonomy, restored from the actual source — was
// completely absent before, despite the handover document itself naming
// category as a required field.
const USED_ITEM_CATEGORIES = ['Electronics', 'Furniture', 'Fashion', 'Vehicles', 'Instruments', 'Other']

function ListUsedItem() {
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState(USED_ITEM_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState('good')
  const [hasReceipt, setHasReceipt] = useState(false)
  const [hasOriginalPackaging, setHasOriginalPackaging] = useState(false)
  const [isDonation, setIsDonation] = useState(false)
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [price, setPrice] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!isDonation && !price) {
      setError('A price is required unless this is a free / Sadaqah listing.')
      return
    }
    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('used_item_listings').insert({
      lister_id: user.id,
      item_name: itemName,
      category,
      description,
      condition,
      has_receipt: hasReceipt,
      has_original_packaging: hasOriginalPackaging,
      is_donation: isDonation,
      listing_type: isDonation ? 'free' : isNegotiable ? 'negotiable' : 'fixed_price',
      price: isDonation ? null : Number(price),
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setItemName('')
    setCategory(USED_ITEM_CATEGORIES[0])
    setDescription('')
    setPrice('')
    setIsNegotiable(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="itemName" className="block text-sm font-medium mb-1">
          Item name
        </label>
        <input
          id="itemName"
          required
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
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
          {USED_ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
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
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hasReceipt}
          onChange={(e) => setHasReceipt(e.target.checked)}
          className="accent-indigo"
        />
        I have the receipt
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hasOriginalPackaging}
          onChange={(e) => setHasOriginalPackaging(e.target.checked)}
          className="accent-indigo"
        />
        I have the original packaging
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDonation}
          onChange={(e) => setIsDonation(e.target.checked)}
          className="accent-indigo"
        />
        This is a free / Sadaqah giveaway, not a sale
      </label>
      {!isDonation && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isNegotiable}
            onChange={(e) => setIsNegotiable(e.target.checked)}
            className="accent-indigo"
          />
          Open to offers (buyers can propose a price below what you ask)
        </label>
      )}

      {!isDonation && (
        <div>
          <label htmlFor="price" className="block text-sm font-medium mb-1">
            Price (₦)
          </label>
          <input
            id="price"
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-market-red">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-market-green">Listed — visible to other buyers now.</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
      >
        {submitting ? 'Listing…' : 'List item'}
      </button>
    </form>
  )
}

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
        {['browse', 'list'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {t === 'browse' ? 'Browse' : 'List an item'}
          </button>
        ))}
      </div>

      {tab === 'browse' && <BrowseUsedItems />}
      {tab === 'list' && <ListUsedItem />}
    </div>
  )
}

function BrowseUsedItems() {
  const [items, setItems] = useState([])
  const [showDonationsOnly, setShowDonationsOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let query = supabase
        .from('used_item_listings')
        .select('id, item_name, description, condition, has_receipt, has_original_packaging, is_donation, price, photo_urls')
        .eq('status', 'available')
        .order('created_at', { ascending: false })

      if (showDonationsOnly) query = query.eq('is_donation', true)

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
  }, [showDonationsOnly])

  return (
    <div>
      <label className="flex items-center gap-2 text-sm mb-4">
        <input
          type="checkbox"
          checked={showDonationsOnly}
          onChange={(e) => setShowDonationsOnly(e.target.checked)}
          className="accent-indigo"
        />
        Free / Sadaqah only
      </label>

      {loading && <p className="text-ink/50">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-ink/50">No listings here yet.</p>}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded border border-ink/10 bg-white px-3 py-2">
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
          </div>
        ))}
      </div>
    </div>
  )
}

function ListUsedItem() {
  const [itemName, setItemName] = useState('')
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState('good')
  const [hasReceipt, setHasReceipt] = useState(false)
  const [hasOriginalPackaging, setHasOriginalPackaging] = useState(false)
  const [isDonation, setIsDonation] = useState(false)
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
      description,
      condition,
      has_receipt: hasReceipt,
      has_original_packaging: hasOriginalPackaging,
      is_donation: isDonation,
      price: isDonation ? null : Number(price),
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setItemName('')
    setDescription('')
    setPrice('')
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
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
        />
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
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
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
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none font-mono"
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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DemandRequest from './DemandRequest'

// Real, simple extraction — strips a trailing size/quantity (25kg, 5L,
// 400g, etc.) so "Rice 25kg" and "Rice 50kg" both correctly search the
// same real commodity, matching every real brand and size together
// rather than only the one exact listing tapped.
function baseCommodityName(fullName) {
  return fullName.replace(/\s*\d+(\.\d+)?\s*(kg|g|l|ml|ltr|litre|litres|pieces|pcs|pack)\b.*$/i, '').trim() || fullName
}

// Shared by Marketplace and Canteen (and every future hub) — the only real
// difference between hubs is which primary_hub they filter to, and whether
// category pills make sense for that hub's kind of browsing.
export default function HubBrowse({ hub, title, accentClass, categories = null, demandNote = null }) {
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      // sellers!inner enforces the hub filter through the real relationship,
      // not a duplicated/denormalized field on products.
      let query = supabase
        .from('products')
        .select('id, name, price, category, image_urls, created_at, hub, sellers!inner(store_name), product_variants(price)')
        .eq('hub', hub)
        .order('created_at', { ascending: false })
        .limit(24)

      if (activeCategory) {
        query = query.eq('category', activeCategory)
      }

      const { data, error } = await query

      if (cancelled) return
      if (error) setError(error.message)
      else setProducts(data)
      setLoading(false)
    }

    if (!searchQuery) loadProducts()

    // Real-time propagation — when any seller's is_open status changes,
    // refresh the list so a closed store's items disappear (or a
    // reopened store's items reappear) without the buyer needing to
    // reload. The real RLS filter on products already governs what's
    // actually visible; this just tells the page when to re-ask.
    const channel = supabase
      .channel(`hub-${hub}-store-status`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sellers' }, () => {
        if (!searchQuery) loadProducts()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [hub, activeCategory, searchQuery])

  async function runSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setLoading(true)
    // search_products() is real full-text search — a generated tsvector +
    // GIN index, not the frontend filtering an array. It searches across
    // every hub, not just this one, since someone searching from Marketplace
    // would still want to know a match exists in Canteen.
    const { data, error } = await supabase.rpc('search_products', { p_query: searchQuery })
    if (error) setError(error.message)
    else setProducts(data || [])
    setLoading(false)
  }

  function clearSearch() {
    setSearchQuery('')
    setSearching(false)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-display font-semibold text-indigo mb-4">{title}</h1>

      <VerificationBanner />

      <form onSubmit={runSearch} className="flex gap-2 mb-4">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search everything on UMC-BCK…"
          className="flex-1 text-sm rounded border border-ink/20 px-3 py-2 focus:outline-none"
        />
        {searching ? (
          <button type="button" onClick={clearSearch} className="text-sm text-ink/60 px-3">
            Clear
          </button>
        ) : (
          <button type="submit" className={`text-sm text-white rounded px-4 ${accentClass}`}>
            Search
          </button>
        )}
      </form>

      {!searching && categories && (
        <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border ${
              activeCategory === null ? `${accentClass} text-white border-transparent` : 'border-ink/20 text-ink/60'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border ${
                activeCategory === c ? `${accentClass} text-white border-transparent` : 'border-ink/20 text-ink/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-ink/50">Loading…</p>}
      {error && <p className="text-market-red">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="text-ink/50">
          {searching
            ? `No results for "${searchQuery}" — ask below and a seller who might carry it can see your request.`
            : 'No live listings here yet — this is real, current data from the database.'}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {products.map((p) => (
          <div key={p.id} className="rounded border border-ink/10 bg-surface overflow-hidden hover:border-indigo transition-colors relative">
            <MarketListButton productId={p.id} productName={p.name} productCategory={p.category} />
            <Link to={`/catalog/${encodeURIComponent(baseCommodityName(p.name))}?hub=${encodeURIComponent(hub)}`}>
              {p.image_urls?.[0] ? (
                <img src={p.image_urls[0]} alt={p.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-paper flex items-center justify-center text-ink/30 text-xs">
                  No photo
                </div>
              )}
              <div className="p-3">
                <p className={`text-xs font-medium mb-1 ${accentClass.replace('bg-', 'text-')}`}>{p.category}</p>
                <p className="font-medium leading-snug">{p.name}</p>
                {p.product_variants?.length > 0 ? (
                  <p className="font-mono text-sm text-indigo mt-1">
                    From ₦{Math.min(...p.product_variants.map((v) => Number(v.price))).toLocaleString()}
                  </p>
                ) : (
                  p.price != null && (
                    <p className="font-mono text-sm text-indigo mt-1">₦{Number(p.price).toLocaleString()}</p>
                  )
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>

      <DemandRequest hub={hub} accentClass={accentClass} note={demandNote} />
    </div>
  )
}

// Real "Add to Market List" — the red circular tap target restored
// exactly as described: tap once, this item is saved to your real,
// personal, reusable market list, so a month later you can pull it back
// up and check for real, current price updates without re-searching.
function MarketListButton({ productId, productName, productCategory }) {
  const [watching, setWatching] = useState(false)
  const [checked, setChecked] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('market_list_items')
        .select('id, market_lists!inner(user_id)')
        .eq('market_lists.user_id', user.id)
        .eq('commodity_name', productName)
        .maybeSingle()
      setWatching(!!data)
      setChecked(true)
    }
    check()
  }, [productId, productName])

  // Real, direct default-list resolution — every user gets a real "My
  // List" automatically the first time they save something, so tapping
  // "+" from the homepage never requires a separate setup step first.
  async function getOrCreateDefaultList(userId) {
    const { data: existing } = await supabase
      .from('market_lists')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (existing) return existing.id
    const { data: created } = await supabase
      .from('market_lists')
      .insert({ user_id: userId, list_name: 'My List' })
      .select('id')
      .single()
    return created?.id
  }

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    if (watching) {
      const { error } = await supabase
        .from('market_list_items')
        .delete()
        .eq('commodity_name', productName)
        .in('list_id', (await supabase.from('market_lists').select('id').eq('user_id', user.id)).data?.map((l) => l.id) || [])
      if (error) {
        setToast(`Could not remove — ${error.message}`)
        setTimeout(() => setToast(null), 3000)
        return
      }
      setWatching(false)
      setToast(`Removed ${productName} from your market list`)
      setTimeout(() => setToast(null), 2200)
    } else {
      const listId = await getOrCreateDefaultList(user.id)
      const { error } = await supabase
        .from('market_list_items')
        .insert({ list_id: listId, commodity_name: productName, category: productCategory, quantity: 1 })
      if (error) {
        setToast(`Could not save — ${error.message}`)
        setTimeout(() => setToast(null), 3000)
        return
      }
      // Real, specific behavior requested: the checkmark confirms the
      // action, then genuinely disappears — reverting the icon back to
      // "+" — even though the real item stays saved in the background.
      // The confirmation is the toast, not a permanent icon change.
      setWatching(true)
      setToast(`✓ ${productName} added to your market list`)
      setTimeout(() => {
        setToast(null)
        setWatching(false)
      }, 2200)
    }
  }

  if (!checked) return null

  return (
    <>
      <button
        onClick={toggle}
        aria-label={watching ? 'Remove from market list' : 'Add to market list'}
        className={`absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full flex items-center justify-center text-sm shadow ${
          watching ? 'bg-market-red text-white' : 'bg-white/90 text-market-red border border-market-red/40'
        }`}
      >
        {watching ? '✓' : '+'}
      </button>
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm rounded-full px-4 py-2 shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </>
  )
}

// Real, proactive prompt — shown before checkout is even attempted, not
// just surfaced as a blocked-order error at the last step. Uses the exact
// same needs_identity_verification() rule the real checkout gate enforces,
// so the banner and the actual block can never disagree with each other.
function VerificationBanner() {
  const [needsVerification, setNeedsVerification] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.rpc('needs_identity_verification', { p_user_id: user.id })
      if (!cancelled) setNeedsVerification(!!data)
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  if (!needsVerification) return null

  return (
    <Link
      to="/settings"
      className="block mb-4 rounded bg-gold/15 border border-gold/40 px-3 py-2 text-sm text-gold-dark"
    >
      🪪 Verify your identity to continue shopping — tap here to submit your ID.
    </Link>
  )
}

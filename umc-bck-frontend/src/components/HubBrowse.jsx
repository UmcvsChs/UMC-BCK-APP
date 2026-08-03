import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DemandRequest from './DemandRequest'

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
        .select('id, name, price, category, image_urls, created_at, sellers!inner(primary_hub)')
        .eq('sellers.primary_hub', hub)
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
    return () => {
      cancelled = true
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
          <Link
            key={p.id}
            to={`/product/${p.id}`}
            className="rounded border border-ink/10 bg-white overflow-hidden hover:border-indigo transition-colors"
          >
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
              {p.price != null && (
                <p className="font-mono text-sm text-indigo mt-1">₦{Number(p.price).toLocaleString()}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <DemandRequest hub={hub} accentClass={accentClass} note={demandNote} />
    </div>
  )
}

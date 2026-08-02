import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Shared by Marketplace and Canteen (and every future hub) — the only real
// difference between hubs is which primary_hub they filter to, and whether
// category pills make sense for that hub's kind of browsing.
export default function HubBrowse({ hub, title, accentClass, categories = null }) {
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [hub, activeCategory])

  return (
    <div className="p-4">
      <h1 className="text-xl font-display font-semibold text-indigo mb-4">{title}</h1>

      {categories && (
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
        <p className="text-ink/50">No live listings here yet — this is real, current data from the database.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real, unified "every brand, every size" catalog — the actual real
// design specified: tap a generic placeholder like Semovita, and see
// every real brand and size genuinely available across the whole
// platform, not just one seller's own stock. Buy directly from whichever
// real option is chosen.
export default function CommodityCatalog() {
  const { commodityName } = useParams()
  const [searchParams] = useSearchParams()
  const hub = searchParams.get('hub')
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(null)
  const [added, setAdded] = useState(null)

  useEffect(() => {
    async function load() {
      // Real hub boundary — without this, "Rice" in the marketplace
      // could pull in unrelated cooked canteen dishes that happen to
      // share the word "rice" in their name.
      const { data } = await supabase.rpc('get_commodity_catalog', { p_search_term: commodityName, p_hub: hub || null })
      setResults(data || [])
      setLoading(false)
    }
    load()
  }, [commodityName, hub])

  async function addToCart(item) {
    setAdding(item.product_id + (item.variant_id || ''))
    const { error } = await supabase.rpc('add_to_cart', {
      p_product_id: item.product_id,
      p_quantity: 1,
      p_product_variant_id: item.variant_id,
      p_addon_ids: [],
    })
    setAdding(null)
    if (!error) {
      setAdded(item.product_id + (item.variant_id || ''))
      setTimeout(() => setAdded(null), 2000)
    }
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">{commodityName}</h1>
      <p className="text-sm text-ink/60 mb-4">
        {results.length} real option{results.length === 1 ? '' : 's'} across every real seller — every brand, every size.
      </p>

      {results.length === 0 ? (
        <p className="text-sm text-ink/50 text-center py-8">No real listings found for "{commodityName}" right now.</p>
      ) : (
        <div className="space-y-2">
          {results.map((item, i) => {
            const key = item.product_id + (item.variant_id || '')
            return (
              <div key={key} className="rounded border border-ink/10 p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.display_name} {i === 0 && <span className="text-xs text-market-green">· Cheapest</span>}
                  </p>
                  <p className="text-xs text-ink/50">{item.store_name}</p>
                  <p className="font-mono text-sm text-indigo">₦{Number(item.price).toLocaleString()}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link to={`/product/${item.product_id}`} className="text-xs text-indigo underline px-1">
                    View
                  </Link>
                  <button
                    onClick={() => addToCart(item)}
                    disabled={adding === key}
                    className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60"
                  >
                    {added === key ? '✓ Added' : adding === key ? '…' : 'Add to cart'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

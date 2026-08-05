import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProductDetail() {
  const { productId } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [variants, setVariants] = useState([])
  const [addons, setAddons] = useState([])
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedAddonIds, setSelectedAddonIds] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [contributorName, setContributorName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [watchLoading, setWatchLoading] = useState(false)
  const [comparisons, setComparisons] = useState(null)
  const [showComparisons, setShowComparisons] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const [{ data: p, error: pErr }, { data: v }, { data: a }, { data: w }] = await Promise.all([
        supabase.from('products').select('*, sellers(return_policy, primary_hub)').eq('id', productId).single(),
        supabase.from('product_variants').select('*').eq('product_id', productId),
        supabase.from('product_addons').select('*').eq('product_id', productId),
        user
          ? supabase.from('price_watches').select('id').eq('product_id', productId).eq('watcher_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      if (cancelled) return
      if (pErr) {
        setError(pErr.message)
      } else {
        setProduct(p)
        setVariants(v || [])
        setAddons(a || [])
        setIsWatched(!!w)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [productId])

  function toggleAddon(id) {
    setSelectedAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function toggleWatch() {
    setWatchLoading(true)
    const { error } = isWatched
      ? await supabase.rpc('remove_price_watch', { p_product_id: productId })
      : await supabase.rpc('add_price_watch', { p_product_id: productId })
    setWatchLoading(false)
    if (error) {
      alert(error.message)
      return
    }
    setIsWatched((prev) => !prev)
  }

  async function comparePrices() {
    setShowComparisons(true)
    // Real search against the same full-text index everything else uses —
    // not a fake "similar items" algorithm, the same search_products() the
    // hub search bars call.
    const { data } = await supabase.rpc('search_products', { p_query: product.name })
    const others = (data || []).filter((p) => p.id !== product.id && p.seller_id !== product.seller_id)
    setComparisons(others)
  }

  async function handleAddToCart() {
    setAdding(true)
    setError(null)

    const { error } = await supabase.rpc('add_to_cart', {
      p_product_id: productId,
      p_quantity: quantity,
      p_product_variant_id: selectedVariant,
      p_addon_ids: selectedAddonIds,
      p_contributor_name: contributorName || null,
    })

    setAdding(false)
    if (error) {
      setError(error.message)
      return
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>
  if (error && !product) return <div className="p-4 text-market-red">{error}</div>
  if (!product) return null

  const unitPrice = selectedVariant
    ? variants.find((v) => v.id === selectedVariant)?.price
    : product.price
  const addonTotal = addons
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + Number(a.price), 0)
  const lineTotal = unitPrice != null ? unitPrice * quantity + addonTotal : null

  return (
    <div className="p-4 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-indigo mb-3">
        ← Back
      </button>

      {product.image_urls?.[0] && (
        <img
          src={product.image_urls[0]}
          alt={product.name}
          className="w-full aspect-square object-cover rounded mb-4"
        />
      )}

      <p className="text-xs text-hub-marketplace font-medium mb-1">{product.category}</p>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h1 className="text-xl font-display font-semibold">{product.name}</h1>
        <button
          onClick={toggleWatch}
          disabled={watchLoading}
          className={`shrink-0 text-xs font-medium rounded-full px-3 py-1 border ${
            isWatched ? 'bg-gold text-ink border-gold' : 'border-ink/20 text-ink/60'
          } disabled:opacity-60`}
        >
          {isWatched ? '★ Watching price' : '☆ Watch price'}
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        {product.condition && (
          <span className="text-xs font-medium bg-indigo/10 text-indigo rounded-full px-2 py-0.5 capitalize">
            {product.condition.replace(/_/g, ' ')}
          </span>
        )}
        {product.stock_quantity != null && (
          <span
            className={`text-xs font-medium rounded-full px-2 py-0.5 ${
              product.stock_quantity === 0
                ? 'bg-market-red/10 text-market-red'
                : product.stock_quantity <= 3
                  ? 'bg-gold/10 text-gold-dark'
                  : 'bg-market-green/10 text-market-green'
            }`}
          >
            {product.stock_quantity === 0 ? 'Out of stock' : `${product.stock_quantity} in stock`}
          </span>
        )}
      </div>
      {product.description && <p className="text-sm text-ink/70 mb-2">{product.description}</p>}

      <button onClick={comparePrices} className="text-xs text-indigo underline mb-4">
        Compare prices from other sellers
      </button>
      {showComparisons && (
        <div className="mb-4 space-y-1">
          {comparisons === null && <p className="text-xs text-ink/50">Searching…</p>}
          {comparisons?.length === 0 && (
            <p className="text-xs text-ink/50">No similar listings found from other sellers.</p>
          )}
          {comparisons?.map((p) => (
            <div key={p.id} className="flex justify-between text-xs rounded border border-ink/10 bg-surface px-2 py-1.5">
              <span>{p.name}</span>
              {p.price != null && <span className="font-mono text-indigo">₦{Number(p.price).toLocaleString()}</span>}
            </div>
          ))}
        </div>
      )}

      {variants.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Choose an option</p>
          <div className="space-y-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className={`flex items-center justify-between rounded border px-3 py-2 cursor-pointer
                  ${selectedVariant === v.id ? 'border-indigo bg-indigo/5' : 'border-ink/15'}`}
              >
                <span className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="variant"
                    checked={selectedVariant === v.id}
                    onChange={() => setSelectedVariant(v.id)}
                    className="accent-indigo"
                  />
                  {v.name}
                </span>
                <span className="font-mono text-sm">₦{Number(v.price).toLocaleString()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {addons.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">
            {product?.sellers?.primary_hub === 'canteen' ? 'Extra ingredients' : 'Add extras'}
          </p>
          <div className="space-y-2">
            {addons.map((a) => (
              <label
                key={a.id}
                className="flex items-center justify-between rounded border border-ink/15 px-3 py-2 cursor-pointer"
              >
                <span className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedAddonIds.includes(a.id)}
                    onChange={() => toggleAddon(a.id)}
                    className="accent-indigo"
                  />
                  {a.name}
                </span>
                <span className="font-mono text-sm">+₦{Number(a.price).toLocaleString()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium">Quantity</label>
        <div className="flex items-center border border-ink/20 rounded">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-1 text-lg"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="px-3 font-mono">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="px-3 py-1 text-lg"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="contributor" className="block text-sm font-medium mb-1">
          For (optional — useful when ordering for a group)
        </label>
        <input
          id="contributor"
          value={contributorName}
          onChange={(e) => setContributorName(e.target.value)}
          placeholder="e.g. Amina"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none text-sm"
        />
      </div>

      {lineTotal != null && (
        <p className="font-mono text-lg text-indigo mb-4">₦{lineTotal.toLocaleString()}</p>
      )}

      {error && (
        <p role="alert" className="text-sm text-market-red mb-3">
          {error}
        </p>
      )}

      {product.sellers?.return_policy && (
        <div className="rounded bg-ink/5 px-3 py-2 mb-3 text-xs text-ink/60">
          <span className="font-medium">Return policy: </span>
          {product.sellers.return_policy}
        </div>
      )}

      <button
        onClick={handleAddToCart}
        disabled={adding || (variants.length > 0 && !selectedVariant) || product.stock_quantity === 0}
        className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
      >
        {product.stock_quantity === 0 ? 'Out of stock' : added ? 'Added to cart ✓' : adding ? 'Adding…' : 'Add to cart'}
      </button>
    </div>
  )
}

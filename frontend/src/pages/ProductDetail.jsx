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

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [{ data: p, error: pErr }, { data: v }, { data: a }] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).single(),
        supabase.from('product_variants').select('*').eq('product_id', productId),
        supabase.from('product_addons').select('*').eq('product_id', productId),
      ])

      if (cancelled) return
      if (pErr) {
        setError(pErr.message)
      } else {
        setProduct(p)
        setVariants(v || [])
        setAddons(a || [])
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
      <h1 className="text-xl font-display font-semibold mb-2">{product.name}</h1>
      {product.description && <p className="text-sm text-ink/70 mb-4">{product.description}</p>}

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
          <p className="text-sm font-medium mb-2">Add extras</p>
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
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none text-sm"
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

      <button
        onClick={handleAddToCart}
        disabled={adding || (variants.length > 0 && !selectedVariant)}
        className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
      >
        {added ? 'Added to cart ✓' : adding ? 'Adding…' : 'Add to cart'}
      </button>
    </div>
  )
}

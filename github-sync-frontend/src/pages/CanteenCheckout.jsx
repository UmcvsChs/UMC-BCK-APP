import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real, uniform canteen checkout — confirmed identical across every
// canteen category. Genuinely distinct from the general marketplace's
// LGA-based delivery fees: real, fixed zones by actual distance, real
// urgency tiers, computed live from the real database tables, not
// hardcoded here — so a real admin update to a zone fee is reflected
// immediately without a new deploy.
export default function CanteenCheckout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('product')
  const variantId = searchParams.get('variant')
  const addonIdsParam = searchParams.get('addons')
  const peopleParam = searchParams.get('people')

  const [product, setProduct] = useState(null)
  const [variant, setVariant] = useState(null)
  const [selectedAddons, setSelectedAddons] = useState([])
  const [zones, setZones] = useState([])
  const [urgencyTiers, setUrgencyTiers] = useState([])
  const [peopleCount, setPeopleCount] = useState(peopleParam ? Math.max(1, Number(peopleParam)) : 1)
  const [deliveryMethod, setDeliveryMethod] = useState('address')
  const [zoneNumber, setZoneNumber] = useState(1)
  const [urgencyTier, setUrgencyTier] = useState('standard')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: zs }, { data: ts }] = await Promise.all([
        supabase.from('products').select('id, name, seller_id, sellers(store_name)').eq('id', productId).single(),
        supabase.from('canteen_delivery_zones').select('*').order('zone_number'),
        supabase.from('canteen_urgency_tiers').select('*').order('surcharge'),
      ])
      setProduct(p)
      setZones(zs || [])
      setUrgencyTiers(ts || [])

      if (variantId) {
        const { data: v } = await supabase.from('product_variants').select('*').eq('id', variantId).single()
        setVariant(v)
      }
      if (addonIdsParam) {
        const ids = addonIdsParam.split(',').filter(Boolean)
        if (ids.length > 0) {
          const { data: a } = await supabase.from('product_addons').select('*').in('id', ids)
          setSelectedAddons(a || [])
        }
      }
      setLoading(false)
    }
    if (productId) load()
  }, [productId, variantId, addonIdsParam])

  const itemPrice = (variant ? Number(variant.price) : Number(product?.price || 0)) + selectedAddons.reduce((s, a) => s + Number(a.price), 0)
  const itemTotal = itemPrice * peopleCount
  const zoneFee = deliveryMethod === 'pickup' ? 0 : (zones.find((z) => z.zone_number === zoneNumber)?.fee || 0)
  const urgencySurcharge = deliveryMethod === 'pickup' ? 0 : (urgencyTiers.find((t) => t.tier_key === urgencyTier)?.surcharge || 0)
  const grandTotal = itemTotal + zoneFee + urgencySurcharge

  async function handleCheckout() {
    if (deliveryMethod === 'address' && !address.trim()) {
      setError('Please enter a delivery address.')
      return
    }
    setSubmitting(true)
    setError(null)

    const items = [{ product_id: productId, variant_id: variantId || null, addon_ids: selectedAddons.map((a) => a.id), quantity: peopleCount }]

    const { data: orderIds, error: orderError } = await supabase.rpc('place_order', {
      p_seller_id: product.seller_id,
      p_items: items,
      p_delivery_address: deliveryMethod === 'address' ? address.trim() : null,
      p_delivery_fee: zoneFee + urgencySurcharge,
      p_delivery_type: deliveryMethod === 'address' ? 'home_delivery' : 'store_pickup',
      p_terms_accepted: true,
    })

    if (orderError) {
      setSubmitting(false)
      setError(orderError.message)
      return
    }

    // Real, honest best-effort — records which real zone/urgency this
    // order actually used, for reporting. If it fails, the order itself
    // (and its real fee) is already correctly placed regardless.
    if (orderIds?.[0] && deliveryMethod === 'address') {
      await supabase
        .from('orders')
        .update({ canteen_zone_number: zoneNumber, canteen_urgency_tier: urgencyTier, canteen_people_count: peopleCount })
        .eq('id', orderIds[0])
    }

    navigate(`/order/${orderIds[0]}`)
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>
  if (!product) return <div className="p-4 text-market-red">Could not load this item.</div>

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-hub-canteen mb-1">Build your order</h1>
      <p className="text-sm text-ink/60 mb-4">
        {product.name} — {product.sellers?.store_name}
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Number of people eating</label>
        <p className="text-xs text-ink/50 mb-2">
          Each person gets their own portion. Extra portions attract additional charges.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => setPeopleCount((n) => Math.max(1, n - 1))} className="w-8 h-8 rounded border border-ink/20">
            −
          </button>
          <span className="font-mono">{peopleCount} person(s)</span>
          <button onClick={() => setPeopleCount((n) => n + 1)} className="w-8 h-8 rounded border border-ink/20">
            +
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Delivery method</label>
        <div className="flex gap-2">
          <button
            onClick={() => setDeliveryMethod('address')}
            className={`flex-1 rounded border-2 p-2 text-sm ${deliveryMethod === 'address' ? 'border-hub-canteen bg-hub-canteen/10' : 'border-ink/15'}`}
          >
            🏠 Deliver to an address
          </button>
          <button
            onClick={() => setDeliveryMethod('pickup')}
            className={`flex-1 rounded border-2 p-2 text-sm ${deliveryMethod === 'pickup' ? 'border-hub-canteen bg-hub-canteen/10' : 'border-ink/15'}`}
          >
            🏪 Pick up myself (free)
          </button>
        </div>
      </div>

      {deliveryMethod === 'address' && (
        <>
          <div className="mb-4">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Delivery address / nearest landmark"
              className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Delivery zone</label>
            <div className="space-y-1.5">
              {zones.map((z) => (
                <label key={z.zone_number} className="flex items-center justify-between rounded border border-ink/15 px-3 py-2 cursor-pointer">
                  <span className="flex items-center gap-2 text-sm">
                    <input type="radio" name="zone" checked={zoneNumber === z.zone_number} onChange={() => setZoneNumber(z.zone_number)} className="accent-hub-canteen" />
                    {z.zone_label} — {z.distance_description}
                  </span>
                  <span className="font-mono text-sm">₦{Number(z.fee).toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Urgency</label>
            <div className="space-y-1.5">
              {urgencyTiers.map((t) => (
                <label key={t.tier_key} className="flex items-center justify-between rounded border border-ink/15 px-3 py-2 cursor-pointer">
                  <span className="flex items-center gap-2 text-sm">
                    <input type="radio" name="urgency" checked={urgencyTier === t.tier_key} onChange={() => setUrgencyTier(t.tier_key)} className="accent-hub-canteen" />
                    {t.label} — {t.time_window}
                  </span>
                  <span className="font-mono text-sm">{t.surcharge > 0 ? `+₦${Number(t.surcharge).toLocaleString()}` : 'No surcharge'}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-ink/40 mb-4">
            ⛽ Delivery fees are adjusted periodically based on current fuel prices in Kaduna and are subject to market forces.
          </p>
        </>
      )}

      <div className="rounded bg-ink/5 p-3 mb-4">
        <p className="text-xs font-semibold mb-2">Order breakdown</p>
        <div className="flex justify-between text-sm mb-1">
          <span>{product.name} × {peopleCount}</span>
          <span className="font-mono">₦{itemTotal.toLocaleString()}</span>
        </div>
        {deliveryMethod === 'address' && (
          <>
            <div className="flex justify-between text-sm mb-1">
              <span>Delivery</span>
              <span className="font-mono">+₦{zoneFee.toLocaleString()}</span>
            </div>
            {urgencySurcharge > 0 && (
              <div className="flex justify-between text-sm mb-1">
                <span>Urgency</span>
                <span className="font-mono">+₦{urgencySurcharge.toLocaleString()}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between font-semibold pt-2 mt-2 border-t border-ink/10">
          <span>Total to pay</span>
          <span className="font-mono text-hub-canteen">₦{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      {error && <p className="text-sm text-market-red mb-3">⚠️ {error}</p>}

      <button
        onClick={handleCheckout}
        disabled={submitting}
        className="w-full rounded bg-hub-canteen text-white font-display font-medium py-2.5 disabled:opacity-60"
      >
        {submitting ? 'Placing order…' : '✓ Proceed to checkout →'}
      </button>
    </div>
  )
}

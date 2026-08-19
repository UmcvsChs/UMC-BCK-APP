import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Cart() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(null)
  const [lgas, setLgas] = useState([])
  const [fees, setFees] = useState({})
  const [lgaId, setLgaId] = useState('')
  const [neighborhoodId, setNeighborhoodId] = useState('')
  const [neighborhoods, setNeighborhoods] = useState([])

  useEffect(() => {
    async function loadNeighborhoods() {
      if (!lgaId) {
        setNeighborhoods([])
        return
      }
      const { data } = await supabase.from('neighborhood_areas').select('id, name').eq('lga_id', lgaId).order('name')
      setNeighborhoods(data || [])
    }
    loadNeighborhoods()
  }, [lgaId])
  const [weightTier, setWeightTier] = useState('light')
  const [urgencyTier, setUrgencyTier] = useState('standard')
  const [deliveryType, setDeliveryType] = useState('home_delivery')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [primaryAddress, setPrimaryAddress] = useState(null)
  const [useManualAddress, setUseManualAddress] = useState(false)

  async function loadPrimaryAddress() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('delivery_addresses')
      .select('id, label, full_address, lga_id, neighborhood_id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle()
    setPrimaryAddress(data || null)
  }

  // Real one-click checkout: when the primary address is in use, keep
  // lgaId/neighborhoodId/deliveryAddress in sync with it automatically so
  // checkout_full_cart still gets the right values without the user
  // touching the manual fields.
  useEffect(() => {
    if (primaryAddress && !useManualAddress) {
      setLgaId(primaryAddress.lga_id || '')
      setNeighborhoodId(primaryAddress.neighborhood_id || '')
      setDeliveryAddress(primaryAddress.full_address || '')
    }
  }, [primaryAddress, useManualAddress])

  function switchToManualAddress() {
    setUseManualAddress(true)
    setLgaId('')
    setNeighborhoodId('')
    setDeliveryAddress('')
  }

  async function loadLgasAndFees() {
    const [{ data: l }, { data: f }] = await Promise.all([
      supabase.from('local_government_areas').select('id, name, states!inner(is_launched)').eq('states.is_launched', true).order('name'),
      supabase.from('delivery_fee_zones').select('lga_id, base_fee'),
    ])
    setLgas(l || [])
    const feeMap = {}
    ;(f || []).forEach((row) => {
      feeMap[row.lga_id] = row.base_fee
    })
    setFees(feeMap)
  }

  async function loadCart() {
    setLoading(true)
    // Cart is per-seller in checkout, so we need the seller behind each
    // product to be able to group correctly.
    const { data, error } = await supabase
      .from('cart_items')
      .select(
        `id, quantity, product_variant_id,
         products ( id, name, price, seller_id, sellers ( store_name, primary_hub, instalment_opt_in ) ),
         product_variants ( name, price )`
      )
      .order('added_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setItems(data)
    }
    setLoading(false)
  }

  const [walletBalance, setWalletBalance] = useState(null)

  async function loadWalletBalance() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
    setWalletBalance(data?.balance ?? null)
  }

  useEffect(() => {
    loadCart()
    loadLgasAndFees()
    loadPrimaryAddress()
    loadWalletBalance()
  }, [])

  async function updateQuantity(cartItemId, newQty) {
    const { error } = await supabase.rpc('update_cart_quantity', { p_cart_item_id: cartItemId, p_quantity: newQty })
    if (error) {
      setError(error.message)
      return
    }
    loadCart()
  }

  async function removeItem(cartItemId) {
    const { error } = await supabase.rpc('remove_from_cart', { p_cart_item_id: cartItemId })
    if (error) {
      setError(error.message)
      return
    }
    loadCart()
  }

  async function handleFullCheckout() {
    setError(null)
    if (!termsAccepted) {
      setError('Please accept the delivery terms before checking out.')
      return
    }
    if (deliveryType === 'home_delivery' && (!lgaId || fees[lgaId] == null)) {
      setError('Please select an LGA with a set delivery fee above — admin hasn\u2019t set a fee for this area yet.')
      return
    }

    setCheckingOut(true)

    const savedGroup = sessionStorage.getItem('activeGroupOrder')
    const activeGroup = savedGroup ? JSON.parse(savedGroup) : null

    const { data: orderIds, error: checkoutError } = await supabase.rpc('checkout_full_cart', {
      p_delivery_address: (activeGroup && activeGroup.location) || deliveryAddress || null,
      p_delivery_lga_id: lgaId || null,
      p_delivery_type: deliveryType,
      p_terms_accepted: !!termsAccepted,
      p_weight_tier: weightTier,
      p_urgency_tier: urgencyTier,
      p_group_order_id: activeGroup?.id || null,
      p_delivery_neighborhood_id: neighborhoodId || null,
    })

    setCheckingOut(false)
    if (checkoutError) {
      setError(checkoutError.message)
      return
    }
    setOrderPlaced(orderIds?.[0] || 'placed')
    loadCart()
  }

  const grandTotal = items.reduce((sum, item) => {
    const unitPrice = item.product_variants?.price ?? item.products.price
    return sum + unitPrice * item.quantity
  }, 0)

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  if (items.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-display font-semibold text-indigo mb-2">Cart</h1>
        <p className="text-ink/50">Your cart is empty.</p>
      </div>
    )
  }

  // Group line items by the seller behind them — checkout_cart() processes
  // one seller at a time by design, matching how orders already work.
  const bySeller = items.reduce((acc, item) => {
    const sellerId = item.products.seller_id
    const storeName = item.products.sellers?.store_name || 'Store'
    const primaryHub = item.products.sellers?.primary_hub
    const instalmentOptIn = item.products.sellers?.instalment_opt_in
    if (!acc[sellerId]) acc[sellerId] = { storeName, primaryHub, instalmentOptIn, items: [] }
    acc[sellerId].items.push(item)
    return acc
  }, {})

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-2">Cart</h1>

      <details className="mb-4 rounded bg-indigo/5 px-3 py-2 text-xs text-ink/70">
        <summary className="cursor-pointer font-medium text-indigo">How does UMC-BCK Secure Pay work?</summary>
        <p className="mt-2">
          When you check out, your payment is held in escrow — deducted from your wallet immediately, but not yet
          released to the seller. It only reaches them once the order is confirmed and delivered. If an order is
          rejected or a dispute is resolved in your favor, the held amount is returned to your wallet in full. This
          is real money movement inside UMC-BCK's own ledger, not a manual promise.
        </p>
      </details>

      {orderPlaced && (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4">
          <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center text-3xl mb-3">✓</div>
          <p className="text-xl font-display font-bold text-indigo mb-1">Order placed!</p>
          <p className="text-sm text-ink/60 mb-4 max-w-xs">
            Confirmed. The seller has been notified and a rider will contact you shortly.
          </p>
          <div className="w-full max-w-xs rounded bg-surface p-3 text-left mb-4">
            <p className="text-xs text-ink/50">Order reference</p>
            <p className="font-mono text-sm">{orderPlaced}</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="w-full max-w-xs text-sm bg-indigo text-white rounded px-6 py-2.5 mb-2 font-medium"
          >
            Track your order
          </button>
          <button onClick={() => navigate('/marketplace')} className="text-sm text-ink/60 underline">
            Back to marketplace
          </button>
        </div>
      )}
      {!orderPlaced && error && (
        <p role="alert" className="text-sm text-market-red mb-4 rounded bg-market-red/10 px-3 py-2">
          ⚠️ {error}
        </p>
      )}

      {items.length > 0 && <FindCheapestPanel items={items} onCartChanged={loadCart} />}

      {Object.keys(bySeller).length > 1 && (
        <div className="rounded bg-gold/10 border border-gold/30 px-3 py-2 mb-4 text-xs text-ink/70">
          Your cart has items from {Object.keys(bySeller).length} different sellers, shown as separate sections
          below just so you can see what's coming from where. You still pay once, at the bottom — the system routes
          the right amount to each seller automatically once delivery is confirmed.
        </div>
      )}

      {Object.entries(bySeller).map(([sellerId, group]) => {
        const subtotal = group.items.reduce((sum, item) => {
          const unitPrice = item.product_variants?.price ?? item.products.price
          return sum + unitPrice * item.quantity
        }, 0)

        return (
          <div key={sellerId} className="mb-6 rounded border border-ink/10 bg-surface p-3">
            <p className="font-display font-medium text-sm text-indigo mb-3">{group.storeName}</p>

            {group.items.map((item) => {
              const unitPrice = item.product_variants?.price ?? item.products.price
              return (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-ink/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.products.name}</p>
                    {item.product_variants && (
                      <p className="text-xs text-ink/50">{item.product_variants.name}</p>
                    )}
                    <p className="font-mono text-xs text-ink/60">
                      ₦{Number(unitPrice).toLocaleString()} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="text-lg px-2"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        if (val > 0) updateQuantity(item.id, val)
                      }}
                      className="w-12 text-center font-mono text-sm border border-ink/20 rounded py-0.5"
                    />
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="text-lg px-2"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-market-red ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}

            <p className="font-mono text-right font-medium mt-3">
              Subtotal: ₦{subtotal.toLocaleString()}
            </p>
            {group.primaryHub === 'canteen' && (
              <p className="font-mono text-right text-xs text-gold-dark">
                + ₦150 service charge
              </p>
            )}
          </div>
        )
      })}

      {items.length > 0 && (
        <div className="rounded border-2 border-indigo bg-indigo/5 p-4 mt-6">
          <p className="font-display font-semibold text-indigo mb-1">Checkout — one payment for everything above</p>
          <p className="text-xs text-ink/60 mb-3">
            {Object.keys(bySeller).length > 1
              ? `Your ${Object.keys(bySeller).length} sellers above are paid automatically once you complete this one payment — you never pay them separately.`
              : 'Review your delivery details and pay.'}
          </p>

          <div className="space-y-2">
            <select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value)}
              className="w-full text-sm rounded border border-ink/20 px-3 py-2"
            >
              <option value="home_delivery">Home delivery</option>
              <option value="store_pickup">Store pickup — free for 1 store, ₦800 for 2–5, ₦1,500 for 6+</option>
              <option value="proxy_pickup">Proxy pickup</option>
            </select>

            {deliveryType === 'home_delivery' && (
              <>
                {primaryAddress && !useManualAddress && primaryAddress.lga_id ? (
                  <div className="rounded border border-market-green/30 bg-market-green/5 p-3 space-y-1">
                    <p className="text-xs font-semibold text-market-green">✓ Deliver to your primary address</p>
                    <p className="text-sm">{primaryAddress.label}</p>
                    <p className="text-xs text-ink/60">{primaryAddress.full_address}</p>
                    <button
                      type="button"
                      onClick={switchToManualAddress}
                      className="text-xs text-indigo underline"
                    >
                      Use a different address instead
                    </button>
                  </div>
                ) : primaryAddress && !useManualAddress && !primaryAddress.lga_id ? (
                  <div className="rounded border border-gold/40 bg-gold/10 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gold-dark">⚠️ Your primary address is missing its LGA</p>
                    <p className="text-xs text-ink/60">
                      Delivery fees are calculated by LGA, so this is needed before we can deliver here. Add it once in{' '}
                      <Link to="/settings" className="underline text-indigo">Settings</Link>, or use a different address for now.
                    </p>
                    <button
                      type="button"
                      onClick={switchToManualAddress}
                      className="text-xs text-indigo underline"
                    >
                      Use a different address instead
                    </button>
                  </div>
                ) : (
                  <>
                    {primaryAddress && (
                      <button
                        type="button"
                        onClick={() => setUseManualAddress(false)}
                        className="text-xs text-indigo underline"
                      >
                        ← Deliver to your primary address ({primaryAddress.label})
                      </button>
                    )}
                    <select
                      value={lgaId}
                      onChange={(e) => { setLgaId(e.target.value); setNeighborhoodId('') }}
                      className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                    >
                      <option value="">Select delivery LGA</option>
                      {lgas.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} {fees[l.id] != null ? `— ₦${Number(fees[l.id]).toLocaleString()}` : '— fee not set'}
                        </option>
                      ))}
                    </select>
                    {neighborhoods.length > 0 && (
                      <select
                        value={neighborhoodId}
                        onChange={(e) => setNeighborhoodId(e.target.value)}
                        className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                      >
                        <option value="">Neighborhood (optional, helps real dispatch)</option>
                        {neighborhoods.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      placeholder="Delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                    />
                    {!primaryAddress && (
                      <p className="text-xs text-ink/40">
                        Tip: add a primary address in <Link to="/settings" className="underline">Settings</Link> for
                        one-click checkout next time.
                      </p>
                    )}
                  </>
                )}
                <select
                  value={weightTier}
                  onChange={(e) => setWeightTier(e.target.value)}
                  className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                >
                  <option value="light">Light — under 5kg — No surcharge</option>
                  <option value="medium">Medium — 5–20kg — +₦300</option>
                  <option value="heavy">Heavy — 20–50kg — +₦600</option>
                  <option value="very_heavy">Very heavy — over 50kg — +₦1,000</option>
                </select>
                <select
                  value={urgencyTier}
                  onChange={(e) => setUrgencyTier(e.target.value)}
                  className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                >
                  <option value="standard">Standard — within 24 hours — No surcharge</option>
                  <option value="express">Express — within 4 hours — +₦500</option>
                  <option value="urgent">Urgent — within 2 hours — +₦1,000</option>
                </select>
                {Object.keys(bySeller).length > 1 && (
                  <p className="text-xs text-ink/50">
                    One combined pickup run from all {Object.keys(bySeller).length} stores — a real, small multi-store
                    collection fee applies on top of the base delivery fee, shown at checkout.
                  </p>
                )}
              </>
            )}
          </div>

          <DeliveryTermsGate accepted={termsAccepted} onAccept={() => setTermsAccepted(true)} />

          {error && (
            <p role="alert" className="text-sm text-market-red mt-2 rounded bg-market-red/10 px-3 py-2">
              {error.toLowerCase().includes('verify your identity') ? (
                <>
                  ⚠️ Please verify your identity before placing an order —{' '}
                  <Link to="/settings" className="underline font-medium">
                    click here to submit your ID
                  </Link>
                  .
                </>
              ) : (
                <>⚠️ {error}</>
              )}
            </p>
          )}

          <div className="mt-3 rounded bg-surface px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-ink/50">Your wallet balance</span>
            <span className={`font-mono font-medium ${walletBalance != null && walletBalance < grandTotal ? 'text-market-red' : 'text-market-green'}`}>
              {walletBalance != null ? `₦${Number(walletBalance).toLocaleString()}` : 'Loading…'}
            </span>
          </div>
          {walletBalance != null && walletBalance < grandTotal && (
            <p className="text-xs text-market-red mt-1">
              ⚠️ Insufficient balance for this order — you need ₦{(grandTotal - walletBalance).toLocaleString()} more.{' '}
              <Link to="/wallet" className="underline font-medium">Fund your wallet</Link>
            </p>
          )}

          <p className="font-mono text-right font-semibold text-lg mt-3 text-indigo">
            Grand total: ₦{grandTotal.toLocaleString()}
          </p>

          <button
            onClick={handleFullCheckout}
            disabled={checkingOut}
            className="w-full mt-3 rounded bg-indigo text-paper font-display font-medium py-3 hover:bg-indigo-light transition-colors disabled:opacity-60"
          >
            {checkingOut ? 'Placing your order…' : 'Pay now — complete order'}
          </button>
        </div>
      )}
    </div>
  )
}

function DeliveryTermsGate({ accepted, onAccept }) {
  const [open, setOpen] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  function handleScroll(e) {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    const progress = Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100))
    setScrollProgress(progress)
    if (progress >= 98) setScrolledToBottom(true)
  }

  if (accepted) {
    return <p className="text-xs text-market-green mt-3">✓ Delivery terms accepted for this order.</p>
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full text-sm font-bold text-gold-dark bg-gold/20 border-2 border-gold/50 rounded px-3 py-2.5 text-center"
      >
        {open ? '▲ Hide delivery terms' : '⚠️ Read and accept delivery terms before proceeding'}
      </button>

      {open && (
        <div className="mt-2 rounded border border-ink/20 bg-surface">
          <div
            onScroll={handleScroll}
            className="h-40 overflow-y-auto px-3 py-2 text-xs text-ink/70 leading-relaxed"
          >
            <p className="font-medium mb-1">Delivery Address</p>
            <p className="mb-3">
              Your delivery address must be accurate and complete before confirming your order. Once an order is in
              transit, the delivery address cannot be changed under any circumstances — attempting to redirect a
              delivery in transit is treated as a failed delivery, and a re-delivery fee applies with no refund of
              the original delivery charge. Your address must be accessible by motorbike or vehicle; if not
              directly accessible, provide the nearest bus stop, junction, or motorable landmark.
            </p>
            <p className="font-medium mb-1">Delivery Agents Are Not Loaders</p>
            <p className="mb-3">
              Delivery agents transport goods from the seller to your delivery point only. Carrying goods up
              staircases or through narrow paths beyond the vehicle drop-off point is not part of their duty. It is
              your responsibility to arrange porterage from the drop-off point if needed.
            </p>
            <p className="font-medium mb-1">Waiting Time Policy</p>
            <p className="mb-3">
              The first 10 minutes after the agent marks arrival are free. After that, ₦50/minute is deducted from
              your wallet, capped at ₦1,000. This charge can only be made if your wallet has sufficient balance —
              UMC-BCK does not extend credit or track a debt.
            </p>
            <p className="font-medium mb-1">Delivery Confirmation</p>
            <p className="mb-3">
              You must confirm receipt before the agent departs. Once confirmed, the order is marked delivered and
              payment is released to the seller from escrow.
            </p>
            <p className="font-medium mb-1">Failed Delivery</p>
            <p>
              If delivery cannot be completed due to an inaccessible address, an unreachable buyer, or a refused
              delivery, this is logged as a failed delivery and may affect any refund available for that order.
            </p>
          </div>
          <div className="h-1 bg-ink/10">
            <div className="h-1 bg-indigo transition-all" style={{ width: `${scrollProgress}%` }} />
          </div>
          <div className="p-2">
            <button
              type="button"
              onClick={onAccept}
              disabled={!scrolledToBottom}
              className="w-full text-xs bg-indigo text-white rounded py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {scrolledToBottom ? 'I accept the delivery terms' : `Scroll to read (${scrollProgress}%)`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Real, two-way search — matching exactly what was specified: search
// can be done per individual item or collectively across the whole
// cart, and for each, either the real average price or the real
// cheapest price. Four genuine real combinations, not one.
function FindCheapestPanel({ items, onCartChanged }) {
  const [mode, setMode] = useState('collective') // 'collective' | item.id
  const [priceType, setPriceType] = useState('cheapest') // 'cheapest' | 'average'
  const [checking, setChecking] = useState(false)
  const [results, setResults] = useState(null)
  const [switching, setSwitching] = useState(null)

  async function runSearch() {
    setChecking(true)
    setResults(null)
    const targetItems = mode === 'collective' ? items : items.filter((i) => i.id === mode)
    const rows = []
    for (const item of targetItems) {
      const currentPrice = item.product_variants?.price ?? item.products.price
      const { data } = await supabase.rpc('get_commodity_price_summary', { p_commodity_name: item.products.name })
      const summary = (data || [])[0]
      if (!summary) continue
      rows.push({
        cartItemId: item.id,
        itemName: item.products.name,
        currentPrice: Number(currentPrice),
        avgPrice: Number(summary.avg_price),
        cheapestPrice: Number(summary.cheapest_price),
        cheapestSeller: summary.cheapest_seller,
        cheapestProductId: summary.cheapest_product_id,
        cheapestVariantId: summary.cheapest_variant_id,
        sellerCount: summary.seller_count,
      })
    }
    setResults(rows)
    setChecking(false)
  }

  async function switchToCheaper(r) {
    setSwitching(r.cartItemId)
    await supabase.rpc('remove_from_cart', { p_cart_item_id: r.cartItemId })
    await supabase.rpc('add_to_cart', {
      p_product_id: r.cheapestProductId,
      p_quantity: 1,
      p_product_variant_id: r.cheapestVariantId || null,
      p_addon_ids: [],
    })
    setSwitching(null)
    setResults((prev) => prev.filter((x) => x.cartItemId !== r.cartItemId))
    onCartChanged()
  }

  const collectiveTotal = results
    ? results.reduce((sum, r) => sum + (priceType === 'average' ? r.avgPrice : r.cheapestPrice), 0)
    : null
  const currentTotal = results ? results.reduce((sum, r) => sum + r.currentPrice, 0) : null

  return (
    <div className="rounded border border-indigo/20 bg-indigo/5 p-3 mb-4">
      <p className="text-sm font-medium text-indigo mb-2">🔍 Real price search</p>

      <div className="mb-2">
        <p className="text-xs text-ink/50 mb-1">Search:</p>
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setMode('collective')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${mode === 'collective' ? 'bg-indigo text-white' : 'border border-ink/20 text-ink/60'}`}
          >
            Whole cart
          </button>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs ${mode === item.id ? 'bg-indigo text-white' : 'border border-ink/20 text-ink/60'}`}
            >
              {item.products.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xs text-ink/50 mb-1">Price type:</p>
        <div className="flex gap-1">
          <button
            onClick={() => setPriceType('cheapest')}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium ${priceType === 'cheapest' ? 'bg-market-green text-white' : 'border border-ink/20 text-ink/60'}`}
          >
            Cheapest / Best price
          </button>
          <button
            onClick={() => setPriceType('average')}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium ${priceType === 'average' ? 'bg-gold-dark text-white' : 'border border-ink/20 text-ink/60'}`}
          >
            Average price
          </button>
        </div>
      </div>

      <button
        onClick={runSearch}
        disabled={checking}
        className="w-full rounded bg-indigo text-white text-sm font-medium py-2 disabled:opacity-60"
      >
        {checking ? 'Searching…' : 'Search now'}
      </button>

      {results && (
        <div className="mt-3 space-y-2">
          {mode === 'collective' && (
            <div className="rounded bg-white/70 px-3 py-2">
              <p className="text-xs font-medium">
                {priceType === 'average' ? 'Real average total' : 'Real cheapest total'} for everything above
              </p>
              <p className="font-mono text-sm text-market-green">
                ₦{collectiveTotal?.toLocaleString()}{' '}
                <span className="text-xs text-ink/40">(you're currently at ₦{currentTotal?.toLocaleString()})</span>
              </p>
            </div>
          )}

          {results.map((r) => (
            <div key={r.cartItemId} className="rounded bg-white/70 px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">{r.itemName}</p>
                <p className="text-xs text-ink/50">
                  {priceType === 'average' ? (
                    <>Real average: ₦{r.avgPrice.toLocaleString()} across {r.sellerCount} real seller{r.sellerCount === 1 ? '' : 's'}</>
                  ) : (
                    <>Real cheapest: ₦{r.cheapestPrice.toLocaleString()} at {r.cheapestSeller}</>
                  )}
                </p>
              </div>
              {priceType === 'cheapest' && r.cheapestPrice < r.currentPrice && (
                <button
                  onClick={() => switchToCheaper(r)}
                  disabled={switching === r.cartItemId}
                  className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60 shrink-0"
                >
                  {switching === r.cartItemId ? '…' : 'Switch & save'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

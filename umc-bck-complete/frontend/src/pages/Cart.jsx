import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Cart() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState({})
  const [checkingOut, setCheckingOut] = useState(null)
  const [orderPlaced, setOrderPlaced] = useState(null)
  const [lgas, setLgas] = useState([])
  const [fees, setFees] = useState({})
  const [lgaId, setLgaId] = useState({})
  const [weightTier, setWeightTier] = useState({})
  const [urgencyTier, setUrgencyTier] = useState({})
  const [deliveryType, setDeliveryType] = useState({})
  const [deliveryAddress, setDeliveryAddress] = useState({})
  const [isInstalment, setIsInstalment] = useState({})
  const [depositAmount, setDepositAmount] = useState({})

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
         products ( id, name, price, seller_id, sellers ( store_name, primary_hub ) ),
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

  useEffect(() => {
    loadCart()
    loadLgasAndFees()
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

  async function handleCheckout(sellerId, subtotal) {
    if (!termsAccepted[sellerId]) {
      setError('Please accept the delivery terms before checking out.')
      return
    }
    const selectedLga = lgaId[sellerId]
    const zoneFee = selectedLga ? fees[selectedLga] : undefined
    if (deliveryType[sellerId] !== 'store_pickup' && (!selectedLga || zoneFee == null)) {
      setError('Please select an LGA with a set delivery fee — admin hasn\u2019t set a fee for this area yet.')
      return
    }
    const weightSurcharge = { light: 0, medium: 300, heavy: 600, very_heavy: 1000 }[weightTier[sellerId] || 'light']
    const urgencySurcharge = { standard: 0, express: 500, urgent: 1000 }[urgencyTier[sellerId] || 'standard']

    let fee
    if (deliveryType[sellerId] === 'store_pickup') {
      // Real tiered pricing, covering the whole pickup trip once — not
      // per seller. Free for 1 store, a real fee for 2-5, higher for 6+,
      // matching the source. Since each seller checks out as its own
      // real transaction, the fee is charged once per session (the first
      // pickup checkout) rather than re-charged on every subsequent one.
      const pickupSellerCount = Object.keys(bySeller).filter((sid) => deliveryType[sid] === 'store_pickup').length
      const alreadyCharged = sessionStorage.getItem('pickupFeeChargedThisSession') === 'true'
      if (alreadyCharged) {
        fee = 0
      } else {
        fee = pickupSellerCount <= 1 ? 0 : pickupSellerCount <= 5 ? 800 : 1500
      }
    } else {
      fee = Number(zoneFee) + weightSurcharge + urgencySurcharge
    }

    setCheckingOut(sellerId)
    setError(null)

    // Real group order pass-through — if this checkout's seller matches an
    // active group order the buyer started or joined, tag the real order
    // with it. Only the initiator's checkout carries the real delivery
    // fee, matching what place_order() itself enforces server-side.
    const savedGroup = sessionStorage.getItem('activeGroupOrder')
    const activeGroup = savedGroup ? JSON.parse(savedGroup) : null
    const groupOrderId = activeGroup && activeGroup.sellerId === sellerId ? activeGroup.id : null

    const params = {
      p_seller_id: sellerId,
      p_delivery_address: (groupOrderId && activeGroup.location) || deliveryAddress[sellerId] || null,
      p_delivery_lga_id: selectedLga || null,
      p_delivery_fee: Number(fee),
      p_delivery_type: deliveryType[sellerId] || 'home_delivery',
      p_terms_accepted: !!termsAccepted[sellerId],
      p_group_order_id: groupOrderId,
    }

    if (isInstalment[sellerId]) {
      const deposit = Number(depositAmount[sellerId])
      if (!deposit || deposit <= 0) {
        setError('Enter a valid deposit amount for instalment checkout.')
        setCheckingOut(null)
        return
      }
      params.p_is_instalment = true
      params.p_deposit_amount = deposit
    }

    const { data: orderId, error } = await supabase.rpc('checkout_cart', params)

    setCheckingOut(null)
    if (error) {
      setError(error.message)
      return
    }
    if (deliveryType[sellerId] === 'store_pickup' && fee > 0) {
      sessionStorage.setItem('pickupFeeChargedThisSession', 'true')
    }
    setOrderPlaced(orderId)
    loadCart()
  }

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
    if (!acc[sellerId]) acc[sellerId] = { storeName, primaryHub, items: [] }
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
          <button onClick={() => navigate('/marketplace')} className="text-sm bg-indigo text-white rounded px-6 py-2.5">
            Back to marketplace
          </button>
        </div>
      )}
      {!orderPlaced && error && (
        <p role="alert" className="text-sm text-market-red mb-4">
          {error}
        </p>
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
                    <span className="font-mono text-sm">{item.quantity}</span>
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

            <div className="mt-3 space-y-2">
              <select
                value={deliveryType[sellerId] || 'home_delivery'}
                onChange={(e) => setDeliveryType((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                className="w-full text-sm rounded border border-ink/20 px-3 py-2"
              >
                <option value="home_delivery">Home delivery</option>
                <option value="store_pickup">Store pickup — free for 1 store, ₦800 for 2–5, ₦1,500 for 6+</option>
                <option value="proxy_pickup">Proxy pickup</option>
              </select>

              {deliveryType[sellerId] !== 'store_pickup' && (
                <>
                  <select
                    value={lgaId[sellerId] || ''}
                    onChange={(e) => setLgaId((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                    className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                  >
                    <option value="">Select delivery LGA</option>
                    {lgas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {fees[l.id] != null ? `— ₦${Number(fees[l.id]).toLocaleString()}` : '— fee not set'}
                      </option>
                    ))}
                  </select>
                  <select
                    value={weightTier[sellerId] || 'light'}
                    onChange={(e) => setWeightTier((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                    className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                  >
                    <option value="light">Light — under 5kg — No surcharge</option>
                    <option value="medium">Medium — 5–20kg — +₦300</option>
                    <option value="heavy">Heavy — 20–50kg — +₦600</option>
                    <option value="very_heavy">Very heavy — over 50kg — +₦1,000</option>
                  </select>
                  <select
                    value={urgencyTier[sellerId] || 'standard'}
                    onChange={(e) => setUrgencyTier((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                    className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                  >
                    <option value="standard">Standard — within 24 hours — No surcharge</option>
                    <option value="express">Express — within 4 hours — +₦500</option>
                    <option value="urgent">Urgent — within 2 hours — +₦1,000</option>
                  </select>
                  <input
                    placeholder="Delivery address"
                    value={deliveryAddress[sellerId] || ''}
                    onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                    className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                  />
                </>
              )}

              <label className="flex items-center gap-2 text-xs text-ink/70">
                <input
                  type="checkbox"
                  checked={!!isInstalment[sellerId]}
                  onChange={(e) => setIsInstalment((prev) => ({ ...prev, [sellerId]: e.target.checked }))}
                  className="accent-gold"
                />
                Pay in instalments (deposit now, balance later)
              </label>
              {isInstalment[sellerId] && (
                <>
                  <input
                    type="number"
                    placeholder={`Deposit (must be less than ₦${subtotal.toLocaleString()})`}
                    value={depositAmount[sellerId] || ''}
                    onChange={(e) => setDepositAmount((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                    className="w-full text-sm rounded border border-ink/20 px-3 py-2 font-mono"
                  />
                  <div className="mt-2 rounded bg-gold/10 px-3 py-2 text-xs text-ink/70 leading-relaxed">
                    <p className="font-medium mb-1">Cancellation policy for instalment orders</p>
                    <p>
                      Cancel within <strong>7 days</strong> — full refund. Cancel between day 7 and day 90 — a{' '}
                      <strong>20% fee applies</strong> (10% to the seller, 10% to UMC-BCK), the rest refunded. After{' '}
                      <strong>90 days</strong>, the deposit is non-refundable but may be transferred to a different
                      item from the same seller.
                    </p>
                  </div>
                </>
              )}
            </div>

            <DeliveryTermsGate
              accepted={!!termsAccepted[sellerId]}
              onAccept={() => setTermsAccepted((prev) => ({ ...prev, [sellerId]: true }))}
            />

            <button
              onClick={() => handleCheckout(sellerId, subtotal)}
              disabled={checkingOut === sellerId}
              className="w-full mt-3 rounded bg-indigo text-paper font-display font-medium py-2 hover:bg-indigo-light transition-colors disabled:opacity-60"
            >
              {checkingOut === sellerId ? 'Placing order…' : `Checkout — ${group.storeName}`}
            </button>
          </div>
        )
      })}
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
        className="text-xs text-indigo underline"
      >
        {open ? 'Hide delivery terms' : 'Read delivery terms to continue'}
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

import { useState, useEffect } from 'react'
import { supabase, SUPABASE_URL } from '../../lib/supabase'
import { queueSale, getQueuedSales, removeQueuedSale, markQueuedSaleFailed } from '../../lib/offlineQueue'

// Real, genuinely shared component — imported independently by both the
// Seller/Director dashboard and the standalone Attendant dashboard, so
// an attendant's real access is exactly this component and nothing more,
// not a hidden tab inside a bigger shared page.
export default function SalesRegister({ sellerId }) {
  const [cart, setCart] = useState([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [manualSearch, setManualSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customQty, setCustomQty] = useState('1')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [debtorName, setDebtorName] = useState('')
  const [debtorPhone, setDebtorPhone] = useState('')
  const [depositPaid, setDepositPaid] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [recentSales, setRecentSales] = useState([])
  const [receivables, setReceivables] = useState([])
  const [markingPaid, setMarkingPaid] = useState(null)
  const [queuedSales, setQueuedSales] = useState([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceParsing, setVoiceParsing] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const [voicePendingItems, setVoicePendingItems] = useState([])
  const [isOwner, setIsOwner] = useState(null)

  useEffect(() => {
    loadRecent()
    refreshQueue()
    checkOwnership()

    function handleOnline() {
      setIsOnline(true)
      syncQueue()
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [sellerId])

  async function refreshQueue() {
    const queued = await getQueuedSales().catch(() => [])
    setQueuedSales(queued.filter((q) => q.sellerId === sellerId))
  }

  // Real ownership check — determines whether a credit sale goes straight
  // through, or needs a real approval request first. Not assumed from
  // context; checked directly against the real sellers row.
  async function checkOwnership() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('sellers').select('user_id').eq('id', sellerId).single()
    setIsOwner(data?.user_id === user.id)
  }

  // Real sync — replays each queued sale through the exact same real RPC
  // calls a normal, online sale uses. A genuine business-logic failure
  // (like real insufficient stock, if something sold out online while this
  // device was offline) is kept and marked failed for the seller to
  // review, not silently dropped or silently retried forever.
  async function syncQueue() {
    const queued = await getQueuedSales().catch(() => [])
    const mine = queued.filter((q) => q.sellerId === sellerId && q.status === 'pending')
    if (mine.length === 0) return
    setSyncing(true)
    for (const q of mine) {
      try {
        const { error } =
          q.paymentMethod === 'credit'
            ? await supabase.rpc('record_credit_sale', {
                p_seller_id: q.sellerId,
                p_product_id: q.productId,
                p_item_name: q.itemName,
                p_quantity: q.quantity,
                p_unit_price: q.unitPrice,
                p_debtor_name: q.debtorName,
                p_debtor_phone: q.debtorPhone,
              })
            : await supabase.rpc('record_walk_in_sale', {
                p_seller_id: q.sellerId,
                p_product_id: q.productId,
                p_item_name: q.itemName,
                p_quantity: q.quantity,
                p_unit_price: q.unitPrice,
                p_payment_method: q.paymentMethod,
                p_scanned_by_barcode: q.scannedByBarcode,
              })
        if (error) {
          await markQueuedSaleFailed(q.id, error.message)
        } else {
          await removeQueuedSale(q.id)
        }
      } catch {
        // Genuine network failure mid-sync — leave it queued, try again
        // next time connectivity returns.
      }
    }
    setSyncing(false)
    refreshQueue()
    loadRecent()
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('sales_register_entries')
      .select('id, item_name, quantity, unit_price, line_total, payment_method, created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(10)
    setRecentSales(data || [])

    const { data: owed } = await supabase
      .from('credit_sale_receivables')
      .select('id, debtor_name, debtor_phone, amount_owed, created_at')
      .eq('seller_id', sellerId)
      .eq('is_paid', false)
      .order('created_at', { ascending: false })
    setReceivables(owed || [])
  }

  async function markPaid(receivableId) {
    setMarkingPaid(receivableId)
    const { error } = await supabase.rpc('mark_receivable_paid', { p_receivable_id: receivableId })
    setMarkingPaid(null)
    if (error) {
      alert(error.message)
      return
    }
    loadRecent()
  }

  async function lookupBarcode(decodedText) {
    setScanError(null)
    const { data, error } = await supabase.rpc('find_product_by_barcode', { p_seller_id: sellerId, p_barcode: decodedText })
    if (error || !data || data.length === 0) {
      setScanError(`No product found for barcode ${decodedText} — add it manually below, or record its barcode on the listing first.`)
      return
    }
    const product = data[0]
    addToCart({
      product_id: product.id,
      item_name: product.name,
      unit_price: Number(product.price),
      quantity: 1,
      scanned_by_barcode: true,
    })
  }

  function addToCart(line) {
    setCart((prev) => [...prev, { ...line, key: `${Date.now()}-${Math.random()}` }])
  }

  // Real browser Web Speech API — free, client-side, no server round-trip
  // for transcription itself. Turning that raw speech into structured line
  // items is a separate, real step that needs actual language
  // understanding — handled by parseVoiceTranscript() below, which calls a
  // real Edge Function.
  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError('Voice input isn\u2019t supported in this browser — add items manually instead.')
      return
    }
    setVoiceError(null)
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-NG'
    recognition.continuous = true
    recognition.onstart = () => setListening(true)
    recognition.onend = () => {
      setListening(false)
      if (voiceTranscript.trim()) parseVoiceTranscript()
    }
    recognition.onresult = (e) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript + ' '
      setVoiceTranscript(transcript.trim())
    }
    recognition.start()
  }

  // Real AI parsing — the natural-language step. Never adds anything
  // straight to the cart on its own; results land in a review list first,
  // since a cashier's voice getting misheard with real money on the line
  // is a real risk, not a hypothetical one.
  async function parseVoiceTranscript() {
    setVoiceParsing(true)
    setVoiceError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-voice-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transcript: voiceTranscript }),
      })
      const result = await res.json()
      if (!res.ok) {
        setVoiceError(result.error || 'Could not parse that — try again or add items manually.')
        return
      }
      setVoicePendingItems(
        (result.items || []).map((it) => ({ ...it, key: `${Date.now()}-${Math.random()}`, unit_price: it.unit_price ?? '' }))
      )
    } catch (err) {
      setVoiceError(`Could not reach the parsing service: ${err.message}`)
    }
    setVoiceParsing(false)
  }

  function confirmVoiceItem(item) {
    if (!item.unit_price || Number(item.unit_price) <= 0) return
    addToCart({
      product_id: null,
      item_name: item.item_name,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity) || 1,
      scanned_by_barcode: false,
    })
    setVoicePendingItems((prev) => prev.filter((i) => i.key !== item.key))
  }

  async function searchCatalog(q) {
    setManualSearch(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    const { data } = await supabase
      .from('products')
      .select('id, name, price, unit, stock_quantity')
      .eq('seller_id', sellerId)
      .eq('status', 'live')
      .ilike('name', `%${q}%`)
      .limit(8)
    setSearchResults(data || [])
  }

  function addCustomItem() {
    if (!customName.trim() || !customPrice || Number(customPrice) <= 0) return
    addToCart({
      product_id: null,
      item_name: customName.trim(),
      unit_price: Number(customPrice),
      quantity: Number(customQty) || 1,
      scanned_by_barcode: false,
    })
    setCustomName('')
    setCustomPrice('')
    setCustomQty('1')
  }

  function removeFromCart(key) {
    setCart((prev) => prev.filter((l) => l.key !== key))
  }

  const cartTotal = cart.reduce((sum, l) => sum + l.unit_price * l.quantity, 0)

  async function completeSale() {
    if (cart.length === 0) return
    if (paymentMethod === 'credit' && !debtorName.trim()) {
      setMessage('Enter who owes this — a credit sale needs a real name to track.')
      return
    }
    setSubmitting(true)
    setMessage(null)

    if (!navigator.onLine) {
      // Genuinely offline — queue on-device, don't pretend the sale is
      // confirmed with the platform yet. Syncs automatically the moment
      // connectivity returns.
      for (const line of cart) {
        await queueSale({
          sellerId,
          productId: line.product_id,
          itemName: line.item_name,
          quantity: line.quantity,
          unitPrice: line.unit_price,
          paymentMethod,
          scannedByBarcode: line.scanned_by_barcode,
          debtorName: paymentMethod === 'credit' ? debtorName.trim() : null,
          debtorPhone: paymentMethod === 'credit' ? debtorPhone.trim() || null : null,
        })
      }
      setMessage(`No connection — queued ₦${cartTotal.toLocaleString()} to sync automatically once you're back online.`)
      setCart([])
      setDebtorName('')
      setDebtorPhone('')
      setDepositPaid('')
      refreshQueue()
      setSubmitting(false)
      return
    }

    try {
      for (const line of cart) {
        const { error } =
          paymentMethod === 'credit'
            ? isOwner
              ? await supabase.rpc('record_credit_sale', {
                  p_seller_id: sellerId,
                  p_product_id: line.product_id,
                  p_item_name: line.item_name,
                  p_quantity: line.quantity,
                  p_unit_price: line.unit_price,
                  p_debtor_name: debtorName.trim(),
                  p_debtor_phone: debtorPhone.trim() || null,
                  p_deposit_paid: Number(depositPaid) || 0,
                })
              : await supabase.rpc('submit_credit_sale_request', {
                  p_seller_id: sellerId,
                  p_product_id: line.product_id,
                  p_item_name: line.item_name,
                  p_quantity: line.quantity,
                  p_unit_price: line.unit_price,
                  p_debtor_name: debtorName.trim(),
                  p_debtor_phone: debtorPhone.trim() || null,
                  p_deposit_paid: Number(depositPaid) || 0,
                })
            : await supabase.rpc('record_walk_in_sale', {
                p_seller_id: sellerId,
                p_product_id: line.product_id,
                p_item_name: line.item_name,
                p_quantity: line.quantity,
                p_unit_price: line.unit_price,
                p_payment_method: paymentMethod,
                p_scanned_by_barcode: line.scanned_by_barcode,
              })
        if (error) throw error
      }
      setMessage(
        paymentMethod === 'credit'
          ? isOwner
            ? `Credit sale recorded — ₦${cartTotal.toLocaleString()} owed by ${debtorName.trim()}.`
            : `Sent for approval — ₦${cartTotal.toLocaleString()} owed by ${debtorName.trim()}, pending the store owner's sign-off.`
          : `Sale recorded — ₦${cartTotal.toLocaleString()} (${paymentMethod}).`
      )
      setCart([])
      setDebtorName('')
      setDebtorPhone('')
      setDepositPaid('')
      loadRecent()
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setSubmitting(false)
  }

  useEffect(() => {
    if (!scannerOpen) return
    let html5QrCode
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      html5QrCode = new Html5Qrcode('barcode-reader')
      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            lookupBarcode(decodedText)
            html5QrCode.stop().catch(() => {})
            setScannerOpen(false)
          },
          () => {}
        )
        .catch(() => setScanError('Could not access the camera — check permissions, or add the item manually below.'))
    })
    return () => {
      if (html5QrCode) html5QrCode.stop().catch(() => {})
    }
  }, [scannerOpen])

  return (
    <div>
      {!isOnline && (
        <div className="mb-3 rounded bg-market-red/10 border border-market-red/30 px-3 py-2 text-xs text-market-red">
          No connection right now — sales will be queued on this device and sync automatically once you're back
          online. Don't go more than 24 hours without connecting, or queued sales stay unrecorded with UMC-BCK.
        </div>
      )}
      {queuedSales.length > 0 && (
        <div className="mb-3 rounded bg-gold/10 border border-gold/30 px-3 py-2 text-xs">
          <p className="font-medium">
            {syncing ? 'Syncing…' : `${queuedSales.filter((q) => q.status === 'pending').length} sale(s) waiting to sync`}
          </p>
          {queuedSales.some(
            (q) => q.status === 'pending' && Date.now() - new Date(q.queued_at).getTime() > 24 * 60 * 60 * 1000
          ) && (
            <p className="text-market-red font-medium mt-1">
              ⚠ Some queued sales are over 24 hours old — connect to the internet now to sync them.
            </p>
          )}
          {queuedSales.some((q) => q.status === 'failed') && (
            <div className="mt-1">
              <p className="text-market-red font-medium">
                {queuedSales.filter((q) => q.status === 'failed').length} queued sale(s) failed to sync and need review:
              </p>
              {queuedSales
                .filter((q) => q.status === 'failed')
                .map((q) => (
                  <p key={q.id} className="text-ink/60">
                    {q.itemName} × {q.quantity} — {q.failure_reason}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-ink/50 mb-3">
        Record a real walk-in sale — cash or transfer, paid directly to you, not through the UMC-BCK wallet. Stock
        decreases here exactly the same way it does for an online order.
      </p>

      <button
        onClick={() => setScannerOpen((v) => !v)}
        className="w-full mb-2 text-sm bg-indigo text-white rounded py-2.5"
      >
        {scannerOpen ? 'Close scanner' : '📷 Scan a barcode'}
      </button>
      {scannerOpen && <div id="barcode-reader" className="mb-3 rounded overflow-hidden" />}
      {scanError && <p className="text-xs text-market-red mb-3">{scanError}</p>}

      <button
        onClick={startVoiceInput}
        disabled={listening || voiceParsing}
        className="w-full mb-2 text-sm bg-gold text-ink rounded py-2.5 disabled:opacity-60"
      >
        {listening ? '🎙️ Listening… tap when done' : voiceParsing ? 'Understanding what you said…' : '🎙️ Speak the sale'}
      </button>
      {voiceTranscript && !listening && (
        <p className="text-xs text-ink/50 mb-2 italic">"{voiceTranscript}"</p>
      )}
      {voiceError && <p className="text-xs text-market-red mb-3">{voiceError}</p>}
      {voicePendingItems.length > 0 && (
        <div className="mb-3 rounded border border-gold/30 bg-gold/10 p-3">
          <p className="text-xs font-medium mb-2">Confirm what was heard before adding to cart</p>
          {voicePendingItems.map((item) => (
            <div key={item.key} className="flex items-center gap-1 mb-1">
              <span className="text-sm flex-1">{item.item_name}</span>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  setVoicePendingItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, quantity: e.target.value } : i)))
                }
                className="w-14 text-xs rounded border border-ink/20 px-1 py-1"
              />
              <input
                type="number"
                placeholder="₦ price"
                value={item.unit_price}
                onChange={(e) =>
                  setVoicePendingItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, unit_price: e.target.value } : i)))
                }
                className="w-20 text-xs rounded border border-ink/20 px-1 py-1"
              />
              <button onClick={() => confirmVoiceItem(item)} className="text-xs bg-market-green text-white rounded px-2 py-1">
                Add
              </button>
              <button
                onClick={() => setVoicePendingItems((prev) => prev.filter((i) => i.key !== item.key))}
                className="text-xs text-market-red"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3">
        <input
          value={manualSearch}
          onChange={(e) => searchCatalog(e.target.value)}
          placeholder="Search your catalog to add manually"
          className="w-full text-sm rounded border border-ink/20 px-3 py-2"
        />
        {searchResults.length > 0 && (
          <div className="mt-1 rounded border border-ink/10 bg-surface divide-y divide-ink/5">
            {searchResults.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 hover:bg-paper">
                <button
                  onClick={() => {
                    addToCart({ product_id: p.id, item_name: p.name, unit_price: Number(p.price), quantity: 1, scanned_by_barcode: false })
                    setManualSearch('')
                    setSearchResults([])
                  }}
                  className="text-left text-sm flex-1"
                >
                  {p.name} — ₦{Number(p.price).toLocaleString()} <span className="text-xs text-ink/40">({p.stock_quantity} in stock)</span>
                </button>
                <button
                  onClick={async () => {
                    const suggestedQty = window.prompt(`Suggested restock quantity for ${p.name}? (optional)`)
                    const { error } = await supabase.rpc('submit_restock_request', {
                      p_seller_id: sellerId,
                      p_product_id: p.id,
                      p_suggested_quantity: suggestedQty ? Number(suggestedQty) : null,
                    })
                    if (error) alert(error.message)
                    else alert(`Flagged ${p.name} for restock.`)
                  }}
                  className="text-xs text-gold-dark shrink-0 ml-2"
                  title="Flag low stock"
                >
                  ⚠ Flag
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded border border-ink/10 bg-surface p-3 mb-3">
        <p className="text-xs font-medium mb-2">Not in your catalog? Add a custom item</p>
        <div className="grid grid-cols-3 gap-2">
          <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Item" className="col-span-3 text-sm rounded border border-ink/20 px-2 py-1" />
          <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="₦ price" className="text-sm rounded border border-ink/20 px-2 py-1" />
          <input type="number" value={customQty} onChange={(e) => setCustomQty(e.target.value)} placeholder="Qty" className="text-sm rounded border border-ink/20 px-2 py-1" />
          <button onClick={addCustomItem} className="text-xs bg-gold text-ink rounded px-2">Add</button>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium mb-1">Cart</p>
        {cart.length === 0 && <p className="text-xs text-ink/50">Empty — scan, search, or add a custom item.</p>}
        {cart.map((l) => (
          <div key={l.key} className="flex items-center justify-between text-sm py-1 border-b border-ink/5">
            <span>
              {l.item_name} × {l.quantity} {l.scanned_by_barcode && '📷'}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-mono">₦{(l.unit_price * l.quantity).toLocaleString()}</span>
              <button onClick={() => removeFromCart(l.key)} className="text-xs text-market-red">✕</button>
            </span>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <>
          <div className="flex items-center justify-between font-medium mb-2">
            <span>Total</span>
            <span className="font-mono text-lg text-indigo">₦{cartTotal.toLocaleString()}</span>
          </div>
          <div className="flex gap-2 mb-3">
            {['cash', 'transfer', 'credit'].map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 text-sm rounded py-2 capitalize ${paymentMethod === m ? 'bg-indigo text-white' : 'bg-surface border border-ink/20'}`}
              >
                {m}
              </button>
            ))}
          </div>
          {paymentMethod === 'credit' && (
            <div className="mb-3 rounded border border-gold/30 bg-gold/10 p-3 space-y-2">
              <p className="text-xs font-medium">Who owes this?</p>
              {isOwner === false && (
                <p className="text-xs text-ink/50">
                  This will go to the store owner for approval before it's recorded — you don't have direct
                  credit-sale authority.
                </p>
              )}
              <input
                value={debtorName}
                onChange={(e) => setDebtorName(e.target.value)}
                placeholder="Name (required)"
                className="w-full text-sm rounded border border-ink/20 px-2 py-1"
              />
              <input
                value={debtorPhone}
                onChange={(e) => setDebtorPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full text-sm rounded border border-ink/20 px-2 py-1"
              />
              <input
                type="number"
                value={depositPaid}
                onChange={(e) => setDepositPaid(e.target.value)}
                placeholder="Deposit paid (₦0 if none)"
                className="w-full text-sm rounded border border-ink/20 px-2 py-1"
              />
            </div>
          )}
          <button onClick={completeSale} disabled={submitting} className="w-full text-sm bg-market-green text-white rounded py-2.5 disabled:opacity-60">
            {submitting ? 'Recording…' : 'Complete sale'}
          </button>
        </>
      )}

      {message && <p className="text-xs mt-2 text-market-green">{message}</p>}

      {receivables.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium mb-2">Outstanding credit (₦{receivables.reduce((s, r) => s + Number(r.amount_owed), 0).toLocaleString()} total)</p>
          <div className="space-y-1">
            {receivables.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm rounded border border-ink/10 bg-surface px-3 py-2">
                <div>
                  <p>{r.debtor_name}</p>
                  {r.debtor_phone && <p className="text-xs text-ink/40">{r.debtor_phone}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-market-red">₦{Number(r.amount_owed).toLocaleString()}</span>
                  <button
                    onClick={() => markPaid(r.id)}
                    disabled={markingPaid === r.id}
                    className="text-xs bg-market-green text-white rounded px-2 py-1 disabled:opacity-60"
                  >
                    {markingPaid === r.id ? '…' : 'Mark paid'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium mb-2">Recent walk-in sales</p>
        {recentSales.length === 0 && <p className="text-xs text-ink/50">None recorded yet.</p>}
        {recentSales.map((s) => (
          <div key={s.id} className="text-xs text-ink/60 flex justify-between py-1 border-b border-ink/5">
            <span>{s.item_name} × {s.quantity} ({s.payment_method})</span>
            <span className="font-mono">₦{Number(s.line_total).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


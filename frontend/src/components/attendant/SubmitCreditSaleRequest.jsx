import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Real credit sale request form — this is what an attendant actually
// uses to send a request to their director, matching the reference
// exactly. Genuinely different from the director-side approval view,
// which is a separate real component.
export default function SubmitCreditSaleRequest({ sellerId }) {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [debtorName, setDebtorName] = useState('')
  const [debtorPhone, setDebtorPhone] = useState('')
  const [depositPaid, setDepositPaid] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [creditProfile, setCreditProfile] = useState(null)

  async function checkCreditProfile(phone) {
    if (!phone || phone.trim().length < 10) {
      setCreditProfile(null)
      return
    }
    const { data } = await supabase.rpc('get_buyer_credit_profile', { p_phone: phone.trim() })
    setCreditProfile(data?.[0] || null)
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('products').select('id, name, price').eq('seller_id', sellerId).eq('status', 'live').order('name')
      setProducts(data || [])
      if (data?.[0]) setProductId(data[0].id)
    }
    load()
  }, [sellerId])

  const selectedProduct = products.find((p) => p.id === productId)
  const totalAmount = selectedProduct ? Number(selectedProduct.price) * Number(quantity || 0) : 0

  async function submit() {
    if (!productId || !debtorName.trim()) {
      setMessage('Please select an item and enter the buyer\u2019s name.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.rpc('submit_credit_sale_request', {
      p_seller_id: sellerId,
      p_product_id: productId,
      p_item_name: selectedProduct.name,
      p_quantity: Number(quantity),
      p_unit_price: Number(selectedProduct.price),
      p_debtor_name: debtorName.trim(),
      p_debtor_phone: debtorPhone.trim() || null,
      p_deposit_paid: depositPaid ? Number(depositPaid) : 0,
    })
    setSubmitting(false)
    if (error) {
      setMessage(`Could not send: ${error.message}`)
      return
    }
    setMessage('✓ Real credit request sent to your director.')
    setDebtorName('')
    setDebtorPhone('')
    setDepositPaid('')
    setQuantity(1)
  }

  return (
    <div className="rounded border border-ink/10 p-3">
      <p className="text-sm font-medium mb-1">Request — credit sale approval</p>
      <p className="text-xs text-ink/50 mb-3">Credit sales must be approved by the director before goods are released.</p>

      <div className="space-y-2">
        <div>
          <label className="block text-xs text-ink/50 mb-1">Item</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full rounded border border-ink/20 px-3 py-2 text-sm">
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₦{Number(p.price).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1">Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />
        </div>
        {selectedProduct && (
          <p className="text-xs text-ink/50">
            Item and amount: {selectedProduct.name} × {quantity} — <span className="font-mono text-indigo">₦{totalAmount.toLocaleString()}</span>
          </p>
        )}
        <div>
          <label className="block text-xs text-ink/50 mb-1">Buyer name</label>
          <input
            value={debtorName}
            onChange={(e) => setDebtorName(e.target.value)}
            placeholder="Full name of buyer"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1">Buyer phone</label>
          <input
            value={debtorPhone}
            onChange={(e) => setDebtorPhone(e.target.value)}
            onBlur={() => checkCreditProfile(debtorPhone)}
            placeholder="08XXXXXXXXX"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />
          {creditProfile && (
            <div
              className={`mt-1.5 rounded px-2 py-1.5 text-xs ${
                creditProfile.trust_tier === 'Highly trusted' || creditProfile.trust_tier === 'Trusted'
                  ? 'bg-market-green/10 text-market-green'
                  : creditProfile.trust_tier.startsWith('New')
                    ? 'bg-ink/5 text-ink/50'
                    : 'bg-gold/10 text-gold-dark'
              }`}
            >
              <p className="font-medium">📊 {creditProfile.trust_tier}</p>
              {creditProfile.total_credit_sales > 0 && (
                <p>
                  Real history: {creditProfile.total_repaid}/{creditProfile.total_credit_sales} repaid across{' '}
                  {creditProfile.distinct_sellers_trusted_by} real seller
                  {creditProfile.distinct_sellers_trusted_by === 1 ? '' : 's'}
                  {creditProfile.total_outstanding > 0 && ` · ₦${Number(creditProfile.total_amount_owed).toLocaleString()} currently owed elsewhere`}
                </p>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1">Deposit paid (₦)</label>
          <input
            type="number"
            value={depositPaid}
            onChange={(e) => setDepositPaid(e.target.value)}
            placeholder="0 if no deposit"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-gold text-ink font-medium text-sm rounded py-2 disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send credit request to director'}
        </button>
        {message && <p className="text-xs text-ink/60">{message}</p>}
      </div>
    </div>
  )
}

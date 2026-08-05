import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { value: 'airtime', label: 'Airtime top-up' },
  { value: 'data', label: 'Data bundles' },
  { value: 'electricity', label: 'Electricity (KEDCO)' },
  { value: 'dstv', label: 'DSTV Subscription' },
  { value: 'gotv', label: 'GOtv Subscription' },
  { value: 'showmax', label: 'Showmax Subscription' },
  { value: 'internet', label: 'Internet (Spectranet/Smile)' },
  { value: 'betting', label: 'Sports Betting' },
  { value: 'waec', label: 'WAEC Result Checker' },
  { value: 'neco', label: 'NECO Result Checker' },
]

export default function Bills() {
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [provider, setProvider] = useState('')
  const [accountReference, setAccountReference] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [myBills, setMyBills] = useState([])

  async function loadMyBills() {
    const { data } = await supabase
      .from('bill_payments')
      .select('id, category, provider, account_reference, amount, status, created_at')
      .order('created_at', { ascending: false })
    setMyBills(data || [])
  }

  useEffect(() => {
    loadMyBills()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.rpc('submit_bill_payment', {
      p_category: category,
      p_provider: provider,
      p_account_reference: accountReference,
      p_amount: Number(amount),
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setProvider('')
    setAccountReference('')
    setAmount('')
    loadMyBills()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Bills & Services</h1>
      <p className="text-sm text-ink/60 mb-6">
        Your wallet is debited immediately and this goes into a real processing queue. Fulfillment is handled manually while a direct provider connection is being set up.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            What are you paying for?
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="provider" className="block text-sm font-medium mb-1">
            Provider
          </label>
          <input
            id="provider"
            required
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. MTN, KEDCO, DSTV"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="accountReference" className="block text-sm font-medium mb-1">
            Phone / meter / smartcard number
          </label>
          <input
            id="accountReference"
            required
            value={accountReference}
            onChange={(e) => setAccountReference(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-1">
            Amount (₦)
          </label>
          <input
            id="amount"
            type="number"
            min="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-market-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Pay from wallet'}
        </button>
      </form>

      <h2 className="text-sm font-display font-semibold text-ink/70 mb-2">Your bill payments</h2>
      {myBills.length === 0 && <p className="text-sm text-ink/50">No bill payments yet.</p>}
      <div className="space-y-2">
        {myBills.map((b) => (
          <div key={b.id} className="rounded border border-ink/10 bg-surface px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {CATEGORIES.find((c) => c.value === b.category)?.label || b.category}
              </p>
              <p className="text-xs text-ink/50">
                {b.provider} · {b.account_reference}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm">₦{Number(b.amount).toLocaleString()}</p>
              <span
                className={`text-xs font-medium capitalize ${
                  b.status === 'completed'
                    ? 'text-market-green'
                    : b.status === 'failed'
                      ? 'text-market-red'
                      : 'text-gold-dark'
                }`}
              >
                {b.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

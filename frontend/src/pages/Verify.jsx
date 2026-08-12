import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Both checks here are deliberately callable without signing in — that's
// the whole point of "Verify" everywhere in this platform: confirm
// something real happened, not gate it behind a login. Neither discloses
// buyer/seller identity or amounts.
export default function Verify() {
  const [mode, setMode] = useState('transaction')
  const [reference, setReference] = useState('')
  const [result, setResult] = useState(null)
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCheck(e) {
    e.preventDefault()
    setLoading(true)
    setChecked(false)

    const fn = mode === 'transaction' ? 'verify_transaction' : 'verify_imei'
    const params = mode === 'transaction' ? { p_reference: reference } : { p_imei: reference }

    const { data } = await supabase.rpc(fn, params)
    setResult(data?.[0] || null)
    setChecked(true)
    setLoading(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Verify</h1>
      <p className="text-sm text-ink/60 mb-6">
        Confirms something real happened on UMC-BCK — never a claim about an item's authenticity or theft status.
      </p>

      <div className="flex gap-1 border-b border-ink/10 mb-4">
        {['transaction', 'imei'].map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setChecked(false)
              setReference('')
            }}
            className={`px-3 py-2 text-sm font-medium ${
              mode === m ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {m === 'transaction' ? 'Transaction reference' : 'IMEI'}
          </button>
        ))}
      </div>

      <form onSubmit={handleCheck} className="space-y-3">
        <input
          required
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={mode === 'transaction' ? 'Order/transaction ID' : '15-digit IMEI'}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
        >
          {loading ? 'Checking…' : 'Check'}
        </button>
      </form>

      {checked && (
        <div className={`mt-4 rounded px-3 py-2 ${result?.found ? 'bg-market-green/10' : 'bg-market-red/10'}`}>
          {result?.found ? (
            mode === 'transaction' ? (
              <p className="text-sm text-market-green">
                Confirmed — a real {result.transaction_type} with status "{result.status}", dated{' '}
                {new Date(result.occurred_at).toLocaleDateString()}.
              </p>
            ) : (
              <p className="text-sm text-market-green">
                Confirmed — "{result.product_name}" was sold through UMC-BCK on{' '}
                {new Date(result.sold_at).toLocaleDateString()}.
              </p>
            )
          ) : (
            <p className="text-sm text-market-red">
              No record found. This doesn't necessarily mean anything is wrong — it just means UMC-BCK has no record of it.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

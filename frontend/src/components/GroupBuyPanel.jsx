import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Real group buying, extended from the real Canteen group order
// mechanic to the whole marketplace — several buyers who each only need
// one bag genuinely pooling to hit a real seller's real wholesale
// threshold, splitting the real discount. Only shows for products whose
// real seller actually offers wholesale terms.
export default function GroupBuyPanel({ productId, wholesaleMinQuantity }) {
  const [mode, setMode] = useState(null) // null | 'start' | 'join'
  const [quantity, setQuantity] = useState(1)
  const [joinCode, setJoinCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!wholesaleMinQuantity) return null

  async function startGroupBuy() {
    setSubmitting(true)
    setError(null)
    const { data, error } = await supabase.rpc('start_wholesale_group_buy', {
      p_product_id: productId,
      p_initial_quantity: Number(quantity),
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setResult({ code: data[0].join_code, started: true })
  }

  async function joinGroupBuy() {
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.rpc('join_wholesale_group_buy', {
      p_join_code: joinCode.trim(),
      p_quantity: Number(quantity),
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setResult({ joined: true })
  }

  return (
    <div className="rounded border-2 border-indigo/30 bg-indigo/5 px-3 py-3 mb-4">
      <p className="text-sm font-semibold text-indigo mb-1">👥 Real group buy — hit wholesale together</p>
      <p className="text-xs text-ink/50 mb-2">
        This seller's real wholesale price unlocks at {wholesaleMinQuantity}+ units. Only need one or two? Pool with
        other real buyers to genuinely get there.
      </p>

      {result?.started && (
        <div className="rounded bg-market-green/10 px-3 py-2 mb-2">
          <p className="text-sm font-medium text-market-green">✓ Real group started</p>
          <p className="text-xs text-ink/60">
            Share this real code: <span className="font-mono font-bold">{result.code}</span>
          </p>
        </div>
      )}
      {result?.joined && <p className="text-sm text-market-green mb-2">✓ You've genuinely joined this real group.</p>}

      {!result && !mode && (
        <div className="flex gap-2">
          <button onClick={() => setMode('start')} className="flex-1 text-xs bg-indigo text-white rounded py-2">
            Start a real group
          </button>
          <button onClick={() => setMode('join')} className="flex-1 text-xs border border-indigo/30 text-indigo rounded py-2">
            Join with a code
          </button>
        </div>
      )}

      {!result && mode === 'start' && (
        <div className="space-y-2">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Your real quantity"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />
          <button onClick={startGroupBuy} disabled={submitting} className="w-full bg-indigo text-white text-sm rounded py-2 disabled:opacity-60">
            {submitting ? 'Starting…' : 'Start real group'}
          </button>
        </div>
      )}

      {!result && mode === 'join' && (
        <div className="space-y-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="e.g. GRP-35A61"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm font-mono"
          />
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Your real quantity"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />
          <button onClick={joinGroupBuy} disabled={submitting} className="w-full bg-market-green text-white text-sm rounded py-2 disabled:opacity-60">
            {submitting ? 'Joining…' : 'Join real group'}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-market-red mt-2">{error}</p>}
    </div>
  )
}

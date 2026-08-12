import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real claim flow — a vendor the team physically surveyed signs up
// normally through the real app, then enters their real code here to
// take over the store and products already listed on their behalf. From
// that moment, their own price edits are what buyers see.
export default function ClaimStore() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.rpc('claim_seller_account', { p_claim_code: code.trim() })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setTimeout(() => navigate('/seller'), 2000)
  }

  if (success) {
    return (
      <div className="p-4 max-w-sm mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-market-green flex items-center justify-center text-3xl mb-3 mx-auto">✓</div>
        <p className="text-lg font-display font-semibold text-indigo">Store claimed</p>
        <p className="text-sm text-ink/60 mt-1">Taking you to your dashboard…</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Claim your store</h1>
      <p className="text-sm text-ink/60 mb-6">
        If UMC-BCK's team already listed your store from a market survey, enter your real claim code below to take
        it over — your own prices from here on.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. CLM-ALAMINSTOR"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 disabled:opacity-60"
        >
          {submitting ? 'Claiming…' : 'Claim my store'}
        </button>
      </form>
      {error && <p className="text-sm text-market-red mt-3">{error}</p>}
    </div>
  )
}

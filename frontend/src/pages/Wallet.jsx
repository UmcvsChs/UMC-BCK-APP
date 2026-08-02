import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Wallet() {
  const [wallet, setWallet] = useState(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [referralCode, setReferralCode] = useState(null)
  const [promoInput, setPromoInput] = useState('')
  const [referralInput, setReferralInput] = useState('')
  const [promoMessage, setPromoMessage] = useState(null)
  const [referralMessage, setReferralMessage] = useState(null)

  async function loadWallet() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('wallets')
      .select('id, balance, currency')
      .eq('user_id', user.id)
      .single()

    if (error) setError(error.message)
    else setWallet(data)
    setLoading(false)
  }

  useEffect(() => {
    loadWallet()
    loadReferralCode()
  }, [])

  async function loadReferralCode() {
    const { data } = await supabase.rpc('get_or_create_my_referral_code')
    setReferralCode(data)
  }

  async function handleRedeemPromo(e) {
    e.preventDefault()
    setPromoMessage(null)
    const { data, error } = await supabase.rpc('redeem_promo_code', { p_code: promoInput.toUpperCase() })
    if (error) {
      setPromoMessage({ type: 'error', text: error.message })
    } else {
      setPromoMessage({ type: 'success', text: `₦${Number(data).toLocaleString()} credited to your wallet.` })
      setPromoInput('')
      loadWallet()
    }
  }

  async function handleRedeemReferral(e) {
    e.preventDefault()
    setReferralMessage(null)
    const { error } = await supabase.rpc('redeem_referral_code', { p_code: referralInput.toUpperCase() })
    if (error) {
      setReferralMessage({ type: 'error', text: error.message })
    } else {
      setReferralMessage({ type: 'success', text: 'Referral bonus credited to both of you.' })
      setReferralInput('')
      loadWallet()
    }
  }

  async function handleTopupRequest(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    const { error } = await supabase.rpc('request_wallet_topup', {
      p_wallet_id: wallet.id,
      p_amount: Number(amount),
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setMessage(
      'Top-up request submitted. Transfer the amount to the account provided, and it will reflect once confirmed.'
    )
    setAmount('')
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-4">Wallet</h1>

      <div className="rounded bg-indigo text-paper p-5 mb-6">
        <p className="text-xs opacity-70 mb-1">Available balance</p>
        <p className="font-mono text-3xl font-medium">
          ₦{wallet ? Number(wallet.balance).toLocaleString() : '0'}
        </p>
      </div>

      <form onSubmit={handleTopupRequest} className="space-y-3">
        <label htmlFor="amount" className="block text-sm font-medium">
          Request a top-up
        </label>
        <input
          id="amount"
          type="number"
          min="1"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount in ₦"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none font-mono"
        />

        {message && <p className="text-sm text-market-green">{message}</p>}
        {error && (
          <p role="alert" className="text-sm text-market-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-gold text-ink font-display font-medium py-2.5 hover:bg-gold-light transition-colors disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Request top-up'}
        </button>

        <p className="text-xs text-ink/50">
          UMC-BCK is wallet-only — there's no pay-on-delivery, and no bank transfer accepted directly at checkout.
          Fund your wallet here first, then shop.
        </p>
      </form>

      <div className="mt-8 pt-6 border-t border-ink/10">
        <p className="text-sm font-medium mb-1">Your referral code</p>
        <p className="text-xs text-ink/50 mb-2">Share it — you both get a wallet bonus when someone joins with it.</p>
        <p className="font-mono text-lg text-gold-dark bg-gold/10 rounded px-3 py-2 text-center">
          {referralCode || '…'}
        </p>
      </div>

      <form onSubmit={handleRedeemReferral} className="mt-4 flex gap-2">
        <input
          placeholder="Got a referral code?"
          value={referralInput}
          onChange={(e) => setReferralInput(e.target.value)}
          className="flex-1 text-sm rounded border border-ink/20 px-3 py-2 font-mono uppercase"
        />
        <button type="submit" className="text-sm bg-gold text-ink rounded px-4 py-2 font-medium">
          Redeem
        </button>
      </form>
      {referralMessage && (
        <p className={`text-xs mt-1 ${referralMessage.type === 'error' ? 'text-market-red' : 'text-market-green'}`}>
          {referralMessage.text}
        </p>
      )}

      <form onSubmit={handleRedeemPromo} className="mt-4 flex gap-2">
        <input
          placeholder="Promo code"
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value)}
          className="flex-1 text-sm rounded border border-ink/20 px-3 py-2 font-mono uppercase"
        />
        <button type="submit" className="text-sm bg-indigo text-white rounded px-4 py-2 font-medium">
          Redeem
        </button>
      </form>
      {promoMessage && (
        <p className={`text-xs mt-1 ${promoMessage.type === 'error' ? 'text-market-red' : 'text-market-green'}`}>
          {promoMessage.text}
        </p>
      )}
    </div>
  )
}

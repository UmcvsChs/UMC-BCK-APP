import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TradeIn() {
  const [sellers, setSellers] = useState([])
  const [sellerId, setSellerId] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [karat, setKarat] = useState('')
  const [weight, setWeight] = useState('')
  const [outcome, setOutcome] = useState('cash_buyback')
  const [askingPrice, setAskingPrice] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [myOffers, setMyOffers] = useState([])
  const [acting, setActing] = useState(null)

  async function loadSellers() {
    const { data } = await supabase
      .from('sellers')
      .select('id, store_name')
      .eq('primary_hub', 'gold_jewelry')
      .eq('verification_status', 'approved')
      .order('store_name')
    setSellers(data || [])
  }

  async function loadMyOffers() {
    const { data } = await supabase
      .from('trade_in_offers')
      .select('id, item_description, desired_outcome, buyer_asking_price, seller_offer_price, status, seller_notes, sellers(store_name)')
      .order('created_at', { ascending: false })
    setMyOffers(data || [])
  }

  useEffect(() => {
    loadSellers()
    loadMyOffers()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.rpc('submit_trade_in_offer', {
      p_seller_id: sellerId,
      p_item_description: itemDescription,
      p_desired_outcome: outcome,
      p_estimated_karat: karat || null,
      p_estimated_weight_grams: weight ? Number(weight) : null,
      p_photo_urls: [],
      p_buyer_asking_price: askingPrice ? Number(askingPrice) : null,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setItemDescription('')
    setKarat('')
    setWeight('')
    setAskingPrice('')
    loadMyOffers()
  }

  async function acceptCounter(offerId) {
    setActing(offerId)
    const { error } = await supabase.rpc('accept_trade_in_counter', { p_offer_id: offerId })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    loadMyOffers()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-hub-gold mb-1">Trade-In</h1>
      <p className="text-sm text-ink/60 mb-6">
        Cash buyback or exchange for another piece — the store you submit to will respond with an offer.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label htmlFor="seller" className="block text-sm font-medium mb-1">
            Store
          </label>
          <select
            id="seller"
            required
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-gold focus:outline-none"
          >
            <option value="">Select a store</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="itemDescription" className="block text-sm font-medium mb-1">
            Item description
          </label>
          <textarea
            id="itemDescription"
            required
            rows={2}
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-gold focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="karat" className="block text-sm font-medium mb-1">
              Estimated karat
            </label>
            <input
              id="karat"
              value={karat}
              onChange={(e) => setKarat(e.target.value)}
              placeholder="e.g. 18k"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="weight" className="block text-sm font-medium mb-1">
              Est. weight (g)
            </label>
            <input
              id="weight"
              type="number"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-gold focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label htmlFor="outcome" className="block text-sm font-medium mb-1">
            What are you hoping for?
          </label>
          <select
            id="outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-gold focus:outline-none"
          >
            <option value="cash_buyback">Cash buyback</option>
            <option value="exchange">Exchange for another piece</option>
          </select>
        </div>

        <div>
          <label htmlFor="askingPrice" className="block text-sm font-medium mb-1">
            Your asking price (optional)
          </label>
          <input
            id="askingPrice"
            type="number"
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-gold focus:outline-none font-mono"
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
          className="w-full rounded bg-hub-gold text-ink font-display font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit offer'}
        </button>
      </form>

      <h2 className="text-sm font-display font-semibold text-ink/70 mb-2">Your offers</h2>
      {myOffers.length === 0 && <p className="text-sm text-ink/50">No offers yet.</p>}

      <div className="space-y-2">
        {myOffers.map((o) => (
          <div key={o.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
            <p className="text-sm font-medium">{o.item_description}</p>
            <p className="text-xs text-ink/50">
              {o.sellers?.store_name} · {o.desired_outcome.replace('_', ' ')}
            </p>
            {o.seller_offer_price != null && (
              <p className="font-mono text-sm text-indigo mt-1">
                Offer: ₦{Number(o.seller_offer_price).toLocaleString()}
              </p>
            )}
            {o.seller_notes && <p className="text-xs text-ink/60 mt-1">{o.seller_notes}</p>}

            <div className="flex items-center justify-between mt-2">
              <span
                className={`text-xs font-medium capitalize ${
                  o.status === 'accepted' || o.status === 'completed'
                    ? 'text-market-green'
                    : o.status === 'declined'
                      ? 'text-market-red'
                      : 'text-gold-dark'
                }`}
              >
                {o.status}
              </span>
              {o.status === 'countered' && (
                <button
                  onClick={() => acceptCounter(o.id)}
                  disabled={acting === o.id}
                  className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60"
                >
                  Accept ₦{Number(o.seller_offer_price).toLocaleString()}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const HUBS = [
  { value: 'general_marketplace', label: 'General Marketplace' },
  { value: 'canteen', label: 'Canteen & Fast Food' },
  { value: 'phones_tech', label: 'Phones & Tech' },
  { value: 'gold_jewelry', label: 'Gold & Jewelry' },
  { value: 'automobile', label: 'Automobile' },
  { value: 'pharma_medical', label: 'Pharma & Medical' },
]

export default function SellerRegister() {
  const navigate = useNavigate()
  const [lgas, setLgas] = useState([])
  const [storeName, setStoreName] = useState('')
  const [tier, setTier] = useState('individual')
  const [primaryHub, setPrimaryHub] = useState('general_marketplace')
  const [lgaId, setLgaId] = useState('')
  const [market, setMarket] = useState('')
  const [stallNumber, setStallNumber] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [tcAccepted, setTcAccepted] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState({ q1: '', q2: '', q3: '' })
  const [quizError, setQuizError] = useState(null)

  const QUIZ = [
    { key: 'q1', q: 'When can you withdraw a buyer\u2019s payment?', options: ['Immediately at checkout', 'Only after the order is confirmed and delivered', 'Whenever I want'], correct: 'Only after the order is confirmed and delivered' },
    { key: 'q2', q: 'Can you accept cash or bank transfer directly from a buyer?', options: ['Yes, if they ask', 'No — UMC-BCK is wallet-only', 'Only for large orders'], correct: 'No — UMC-BCK is wallet-only' },
    { key: 'q3', q: 'What happens if a buyer raises a dispute?', options: ['I lose automatically', 'Admin reviews it and can resolve in favor of either side', 'It gets ignored'], correct: 'Admin reviews it and can resolve in favor of either side' },
  ]

  function checkQuiz() {
    const allCorrect = QUIZ.every((item) => quizAnswers[item.key] === item.correct)
    if (!allCorrect) {
      setQuizError('One or more answers isn\u2019t correct — please review and try again.')
      return false
    }
    setQuizError(null)
    return true
  }

  useEffect(() => {
    // Kaduna only, matching the actual launch state — states.is_launched is
    // the real flag for this, not a hardcoded list.
    async function loadLgas() {
      const { data } = await supabase
        .from('local_government_areas')
        .select('id, name, states!inner(is_launched)')
        .eq('states.is_launched', true)
        .order('name')
      setLgas(data || [])
    }
    loadLgas()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!tcAccepted) {
      setError('Please confirm you have read the Terms & Conditions.')
      return
    }
    if (!checkQuiz()) return

    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('sellers').insert({
      user_id: user.id,
      store_name: storeName,
      tier,
      primary_hub: primaryHub,
      lga_id: lgaId,
      market: market || null,
      stall_number: stallNumber || null,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="p-4 max-w-md mx-auto text-center py-16">
        <h1 className="text-xl font-display font-semibold text-indigo mb-2">Registration submitted</h1>
        <p className="text-sm text-ink/60 mb-4">
          Your store is pending admin review. You'll be able to add listings once approved.
        </p>
        <button onClick={() => navigate('/seller')} className="text-indigo font-medium text-sm">
          Go to Seller Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Register your store</h1>
      <p className="text-sm text-ink/60 mb-6">Every store is reviewed before it goes live.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="storeName" className="block text-sm font-medium mb-1">
            Store name
          </label>
          <input
            id="storeName"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="tier" className="block text-sm font-medium mb-1">
            Business type
          </label>
          <select
            id="tier"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
          >
            <option value="individual">Individual</option>
            <option value="business">Registered business</option>
            <option value="supermarket">Supermarket</option>
          </select>
        </div>

        <div>
          <label htmlFor="hub" className="block text-sm font-medium mb-1">
            Which market are you joining?
          </label>
          <select
            id="hub"
            value={primaryHub}
            onChange={(e) => setPrimaryHub(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
          >
            {HUBS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lga" className="block text-sm font-medium mb-1">
            LGA
          </label>
          <select
            id="lga"
            required
            value={lgaId}
            onChange={(e) => setLgaId(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
          >
            <option value="">Select an LGA</option>
            {lgas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="market" className="block text-sm font-medium mb-1">
            Market (optional)
          </label>
          <input
            id="market"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="stallNumber" className="block text-sm font-medium mb-1">
            Stall number (optional)
          </label>
          <input
            id="stallNumber"
            value={stallNumber}
            onChange={(e) => setStallNumber(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
          />
        </div>

        <div className="pt-4 border-t border-ink/10">
          <p className="text-sm font-medium mb-2">Before you register</p>
          <details className="mb-3 rounded bg-ink/5 px-3 py-2 text-xs text-ink/70">
            <summary className="cursor-pointer font-medium text-indigo">Read the Terms & Conditions</summary>
            <p className="mt-2">
              UMC-BCK is wallet-only — payments are held in escrow and only released once an order is confirmed and
              delivered. There is no cash or bank transfer accepted directly from a buyer. Admin reviews disputes and
              can resolve in favor of either party. Full terms cover 12 sections (A–L), governed under Kaduna State
              courts jurisdiction.
            </p>
          </details>

          <label className="flex items-start gap-2 text-sm mb-3">
            <input
              type="checkbox"
              checked={tcAccepted}
              onChange={(e) => setTcAccepted(e.target.checked)}
              className="accent-indigo mt-0.5"
            />
            I have read and understood the Terms & Conditions.
          </label>

          {tcAccepted && (
            <div className="space-y-3">
              {QUIZ.map((item) => (
                <div key={item.key}>
                  <p className="text-sm font-medium mb-1">{item.q}</p>
                  {item.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-xs mb-1">
                      <input
                        type="radio"
                        name={item.key}
                        checked={quizAnswers[item.key] === opt}
                        onChange={() => setQuizAnswers((prev) => ({ ...prev, [item.key]: opt }))}
                        className="accent-indigo"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ))}
              {quizError && <p className="text-xs text-market-red">{quizError}</p>}
            </div>
          )}
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
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  )
}

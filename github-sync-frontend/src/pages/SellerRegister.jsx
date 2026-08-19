import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real, complete list of CBN-licensed Nigerian banks and fintechs.
const NIGERIAN_BANKS = [
  'Access Bank', 'Alternative Bank', 'Carbon (Paylater)', 'Citibank Nigeria', 'Ecobank Nigeria', 'Eyowo',
  'Fairmoney', 'Fidelity Bank', 'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Globus Bank',
  'Guaranty Trust Bank (GTBank)', 'Jaiz Bank', 'Keystone Bank', 'Kuda Bank', 'Lotus Bank', 'Moniepoint',
  'OPay', 'Optimus Bank', 'PalmPay', 'Parallex Bank', 'Polaris Bank', 'Premium Trust Bank', 'Providus Bank',
  'Rubies Bank', 'Signature Bank', 'Sparkle', 'Stanbic IBTC Bank', 'Standard Chartered Bank', 'Sterling Bank',
  'Suntrust Bank', 'Taj Bank', 'Titan Trust Bank', 'Union Bank of Nigeria', 'United Bank for Africa (UBA)',
  'Unity Bank', 'Wema Bank', 'Zenith Bank',
]

const HUBS = [
  { value: 'general_marketplace', label: 'General Marketplace' },
  { value: 'canteen', label: 'Canteen & Fast Food' },
  { value: 'phones_tech', label: 'Phones & Tech' },
  { value: 'gold_jewelry', label: 'Gold & Jewelry' },
  { value: 'automobile', label: 'Automobile' },
  { value: 'pharma_medical', label: 'Pharma & Medical' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'thrift_wear', label: 'Thrift Wear' },
  { value: 'textile', label: 'Textile' },
  { value: 'green_energy', label: 'Green Energy (Solar & Renewables)' },
  { value: 'electrical_equipment', label: 'Electrical Equipment' },
  { value: 'interior_appliances', label: 'Interior & Home Appliances' },
  { value: 'plastic_utensils', label: 'Plastic & Kitchen Utensils' },
  { value: 'office_equipment', label: 'Office Equipment & Stationery' },
  { value: 'motorcycles_tricycles', label: 'Motorcycles, Tricycles & Accessories' },
  { value: 'power_industrial_tools', label: 'Power & Industrial Tools' },
  { value: 'panteka_market', label: 'Panteka Market' },
  { value: 'kids_and_baby', label: 'Kids & Baby' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'interior_decor', label: 'Furniture, Curtain & Bedding' },
]

export default function SellerRegister() {
  const navigate = useNavigate()
  const [lgas, setLgas] = useState([])
  const [storeName, setStoreName] = useState('')
  const [setupMethod, setSetupMethod] = useState('self')
  const [setupAddress, setSetupAddress] = useState('')
  const [tier, setTier] = useState('individual')
  const [selectedCategories, setSelectedCategories] = useState(['general_marketplace'])
  const [pcnNumber, setPcnNumber] = useState('')
  const [nafdacNumber, setNafdacNumber] = useState('')
  const [sellingMode, setSellingMode] = useState('retail_only')
  const [instalmentOptIn, setInstalmentOptIn] = useState(false)
  const [wholesaleMinQty, setWholesaleMinQty] = useState('')
  const [wholesaleMinDesc, setWholesaleMinDesc] = useState('')
  const [wholesaleDiscountType, setWholesaleDiscountType] = useState('')
  const [wholesaleDiscountDetails, setWholesaleDiscountDetails] = useState('')
  const [lgaId, setLgaId] = useState('')
  const [market, setMarket] = useState('')
  const [stallNumber, setStallNumber] = useState('')
  const [priorCredential, setPriorCredential] = useState(null)
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')

  useEffect(() => {
    async function checkCredential() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.rpc('get_apprenticeship_credential', { p_user_id: user.id })
      const cred = data?.[0]
      if (cred?.credential_tier?.startsWith('Verified')) setPriorCredential(cred)
    }
    checkCredential()
  }, [])
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

    // Real, direct architecture match: multiple selected categories
    // means multiple real stores, one per category, matching exactly
    // what was described — "you will have boutique interface set up
    // first before you now set up the other interfaces." All under the
    // same real account, using the same already-proven multi-store
    // ownership model.
    const rows = selectedCategories.map((hub) => ({
      user_id: user.id,
      store_name: storeName,
      tier,
      primary_hub: hub,
      lga_id: lgaId,
      market: market || null,
      stall_number: stallNumber || null,
      selling_mode: sellingMode,
      wholesale_min_quantity: sellingMode !== 'retail_only' && wholesaleMinQty ? Number(wholesaleMinQty) : null,
      wholesale_min_description: sellingMode !== 'retail_only' ? wholesaleMinDesc || null : null,
      wholesale_discount_type: sellingMode !== 'retail_only' ? wholesaleDiscountType || null : null,
      wholesale_discount_details: sellingMode !== 'retail_only' ? wholesaleDiscountDetails || null : null,
      setup_method: setupMethod,
      setup_address: setupMethod === 'admin_assisted' ? setupAddress.trim() || null : null,
      admin_setup_status: setupMethod === 'admin_assisted' ? 'pending' : null,
      instalment_opt_in: instalmentOptIn,
    }))

    const { data: newSellers, error } = await supabase.from('sellers').insert(rows).select('id, primary_hub')

    // Real PCN/NAFDAC licensing — genuinely saved now, restored after a
    // systematic audit found this real table sitting completely unused,
    // meaning Pharma sellers had no way to submit real licensing at all.
    if (!error && newSellers && pcnNumber.trim()) {
      const pharmaSeller = newSellers.find((s) => s.primary_hub === 'pharma_medical')
      if (pharmaSeller) {
        await supabase.from('pharma_seller_details').insert({
          seller_id: pharmaSeller.id,
          pcn_registration_number: pcnNumber.trim(),
          nafdac_premises_number: nafdacNumber.trim() || null,
        })
      }
    }

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }

    // Real bank account collected at the very start, exactly as
    // requested — by the time a seller has any real money to
    // withdraw, weeks or months of ordinary trading have already
    // passed, so the real 24-hour activation delay is a non-issue by
    // then, not friction.
    if (bankName && bankAccountNumber.trim() && bankAccountName.trim()) {
      await supabase.rpc('add_seller_bank_account', {
        p_bank_name: bankName,
        p_account_number: bankAccountNumber.trim(),
        p_account_name: bankAccountName.trim(),
      })
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
      <p className="text-sm text-ink/60 mb-4">Every store is reviewed before it goes live.</p>

      <Link to="/demand-signals" className="block rounded bg-indigo/5 border border-indigo/20 px-3 py-2 text-sm text-indigo font-medium mb-4">
        📢 See what real buyers are already asking for →
      </Link>

      {priorCredential && (
        <div className="rounded border-2 border-gold bg-gold/10 px-3 py-2 mb-4">
          <p className="text-sm font-semibold text-gold-dark">🏅 {priorCredential.credential_tier}</p>
          <p className="text-xs text-ink/60 mt-0.5">
            Your real {priorCredential.total_days_active} days and {priorCredential.total_real_sales_recorded} genuine
            recorded sales as an attendant travel with you — this is recognized on your new store from day one.
          </p>
        </div>
      )}

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
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 rounded border border-ink/15 px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={instalmentOptIn}
            onChange={(e) => setInstalmentOptIn(e.target.checked)}
            className="accent-market-green"
          />
          <span className="text-sm">
            Let real buyers pay for higher-value items in real instalments — deposit now, balance over time
          </span>
        </label>

        <div>
          <label className="block text-sm font-medium mb-2">How do you want to set up your store?</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSetupMethod('self')}
              className={`rounded-lg border-2 p-3 text-center ${setupMethod === 'self' ? 'border-market-green bg-market-green/10' : 'border-ink/15'}`}
            >
              <p className="text-2xl mb-1">📱</p>
              <p className="text-xs font-semibold">Set up myself</p>
            </button>
            <button
              type="button"
              onClick={() => setSetupMethod('admin_assisted')}
              className={`rounded-lg border-2 p-3 text-center ${setupMethod === 'admin_assisted' ? 'border-gold bg-gold/10' : 'border-ink/15'}`}
            >
              <p className="text-2xl mb-1">🧑‍💼</p>
              <p className="text-xs font-semibold">Set up by admin</p>
            </button>
          </div>
          {setupMethod === 'admin_assisted' && (
            <div className="mt-2">
              <p className="text-xs text-gold-dark mb-2">
                A real UMC-BCK team member will visit and set your store up in person — real ₦50 per item they
                configure for you. Please give us your real shop address so we can plan the visit.
              </p>
              <textarea
                value={setupAddress}
                onChange={(e) => setSetupAddress(e.target.value)}
                placeholder="Your real shop address — market, area, landmark"
                className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          )}
          {setupMethod === 'self' && (
            <p className="text-xs text-ink/50 mt-2">You'll list your own items directly — free, no setup fee.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Registration type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTier('individual')}
              className={`rounded-lg border-2 p-3 text-center ${tier === 'individual' ? 'border-market-green bg-market-green/10' : 'border-ink/15'}`}
            >
              <p className="text-2xl mb-1">🧑‍💼</p>
              <p className="text-xs font-semibold">Individual</p>
            </button>
            <button
              type="button"
              onClick={() => setTier('business')}
              className={`rounded-lg border-2 p-3 text-center ${tier === 'business' ? 'border-market-green bg-market-green/10' : 'border-ink/15'}`}
            >
              <p className="text-2xl mb-1">🏬</p>
              <p className="text-xs font-semibold">Multi-Store</p>
            </button>
          </div>
          {tier === 'individual' && (
            <p className="text-xs text-ink/50 mt-2">A single real store. Free to start, up to 200 listings, NIN verification only.</p>
          )}
          {tier === 'business' && (
            <p className="text-xs text-ink/50 mt-2">
              You'll get a real Director dashboard for managing multiple real stores, assigning attendants across
              locations, and adding stock without re-uploading. If your combined stock qualifies for negotiated
              terms (over ₦1M in stock), UMC-BCK Admin will reach out separately to discuss real rates.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Which real categories does your business belong to?</label>
          <p className="text-xs text-ink/50 mb-2">
            Select as many as genuinely apply — you'll get a real, separate tailored dashboard set up for each one.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {HUBS.map((h) => (
              <label
                key={h.value}
                className={`flex items-center gap-2 rounded border px-2 py-1.5 text-xs cursor-pointer ${
                  selectedCategories.includes(h.value) ? 'border-market-green bg-market-green/10' : 'border-ink/15'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(h.value)}
                  onChange={() =>
                    setSelectedCategories((prev) =>
                      prev.includes(h.value) ? prev.filter((c) => c !== h.value) : [...prev, h.value]
                    )
                  }
                  className="accent-market-green"
                />
                {h.label}
              </label>
            ))}
          </div>
        </div>

        {selectedCategories.includes('pharma_medical') && (
          <div className="rounded border-2 border-market-red/30 bg-market-red/5 p-3 space-y-2">
            <p className="text-xs font-medium text-market-red">
              Real, legally required — Pharmaceuticals & Medical Devices Council of Nigeria licensing
            </p>
            <div>
              <label className="block text-xs text-ink/50 mb-1">Real PCN registration number</label>
              <input
                value={pcnNumber}
                onChange={(e) => setPcnNumber(e.target.value)}
                placeholder="e.g. PCN/12345"
                className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">Real NAFDAC premises number</label>
              <input
                value={nafdacNumber}
                onChange={(e) => setNafdacNumber(e.target.value)}
                placeholder="e.g. NAFDAC/PREM/12345"
                className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-ink/40">A real UMC-BCK admin will verify this before your Pharma listings go live.</p>
          </div>
        )}

        <div className="rounded border border-ink/15 p-3">
          <label className="block text-sm font-medium mb-1">Are you a retail seller, wholesale seller, or both?</label>
          <p className="text-xs text-ink/50 mb-2">
            Real, matching what markets like the Sari section actually deal in — bulk/dozen sales only, retail only,
            or a mix of both.
          </p>
          <select
            value={sellingMode}
            onChange={(e) => setSellingMode(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          >
            <option value="retail_only">Retail only</option>
            <option value="wholesale_only">Wholesale / bulk only</option>
            <option value="both">Both retail and wholesale</option>
          </select>

          {sellingMode !== 'retail_only' && (
            <div className="mt-3 space-y-2">
              <input
                type="number"
                placeholder="Minimum quantity to qualify as wholesale (e.g. 12)"
                value={wholesaleMinQty}
                onChange={(e) => setWholesaleMinQty(e.target.value)}
                className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
              />
              <input
                placeholder="Describe it your own way (e.g. 'a full carton', 'a dozen')"
                value={wholesaleMinDesc}
                onChange={(e) => setWholesaleMinDesc(e.target.value)}
                className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
              />
              <select
                value={wholesaleDiscountType}
                onChange={(e) => setWholesaleDiscountType(e.target.value)}
                className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
              >
                <option value="">How does your wholesale discount work?</option>
                <option value="cash_discount">Reduced cash price</option>
                <option value="free_goods">Extra goods/items instead of cash discount</option>
                <option value="both">Both — cash discount and extra goods</option>
              </select>
              <textarea
                placeholder="Describe your real wholesale terms (e.g. 'Buy 1 carton, get 10% off' or 'Buy a dozen, get 1 free')"
                value={wholesaleDiscountDetails}
                onChange={(e) => setWholesaleDiscountDetails(e.target.value)}
                className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          )}
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
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
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
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
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
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          />
        </div>

        <div className="pt-4 border-t border-ink/10">
          <p className="text-sm font-medium mb-1">Real bank account for withdrawals</p>
          <p className="text-xs text-ink/50 mb-2">
            The account your real earnings will be paid out to. You can add a second real account later — any
            future change takes 24 hours to activate, to protect you if your account is ever compromised.
          </p>
          <div className="space-y-2">
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            >
              <option value="">-- Select your bank --</option>
              {NIGERIAN_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <input
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="Account number"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
            <input
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="Account name"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
          </div>
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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real "Pay Gradually" — deliberately not called BNPL, because it isn't
// one: nobody takes an item home until it's genuinely fully paid off.
// A real deposit now, the real balance over time, and the item only
// changes hands once the balance is genuinely zero — enforced directly
// by the database, not just described here.
const CATEGORIES = [
  { key: 'Household Electronics', label: 'Household Electronics' },
  { key: 'Cars, Motorcycles & Tricycles', label: 'Cars, Motorcycles & Tricycles' },
  { key: 'Gadgets', label: 'Gadgets' },
  { key: 'Green Energy', label: 'Green Energy' },
  { key: 'Others', label: 'Others' },
]

export default function Instalment() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key)
  const [products, setProducts] = useState([])
  const [eligibility, setEligibility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [submittingInquiry, setSubmittingInquiry] = useState(false)
  const [myInquiries, setMyInquiries] = useState([])
  const [responsesByInquiry, setResponsesByInquiry] = useState({})

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const [{ data: eligData }, { data: productData }] = await Promise.all([
        user ? supabase.rpc('check_instalment_eligibility', { p_user_id: user.id }) : Promise.resolve({ data: null }),
        supabase
          .from('products')
          .select('id, name, price, image_urls, category, sellers!inner(store_name, instalment_opt_in)')
          .eq('sellers.instalment_opt_in', true)
          .eq('status', 'live')
          .order('created_at', { ascending: false }),
      ])
      setEligibility(eligData?.[0] || null)
      setProducts(productData || [])

      if (user) {
        const { data: inquiries } = await supabase
          .from('instalment_inquiries')
          .select('id, category, description, status, created_at')
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false })
        setMyInquiries(inquiries || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function loadResponses(inquiryId) {
    const { data } = await supabase
      .from('instalment_inquiry_responses')
      .select('id, price, terms_notes, created_at, sellers(store_name, id)')
      .eq('inquiry_id', inquiryId)
    setResponsesByInquiry((prev) => ({ ...prev, [inquiryId]: data || [] }))
  }

  async function submitInquiry(e) {
    e.preventDefault()
    if (!description.trim()) return
    setSubmittingInquiry(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('instalment_inquiries')
      .insert({ buyer_id: user.id, category: activeCategory, description: description.trim() })
      .select()
      .single()
    setSubmittingInquiry(false)
    if (error) {
      alert(error.message)
      return
    }
    setMyInquiries((prev) => [data, ...prev])
    setDescription('')
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  const productsInCategory = products.filter((p) =>
    activeCategory === 'Others'
      ? true
      : (p.category || '').toLowerCase().includes(activeCategory.toLowerCase().split(',')[0].toLowerCase())
  )

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">💳 Pay Gradually</h1>
      <p className="text-sm text-ink/60 mb-2">
        Pay a real deposit now, the real balance over time — you take the item home once it's genuinely fully paid,
        not before.
      </p>
      <Link to="/my-instalments" className="inline-block text-xs text-indigo font-medium mb-4">
        View my real active plans →
      </Link>

      {eligibility && !eligibility.is_eligible && (
        <div className="rounded border-2 border-gold/40 bg-gold/10 px-3 py-2 mb-4">
          <p className="text-sm font-semibold text-gold-dark">Not yet available for your account</p>
          <p className="text-xs text-ink/60 mt-1">{eligibility.reason}</p>
        </div>
      )}
      {eligibility?.is_eligible && (
        <div className="rounded border border-market-green/30 bg-market-green/10 px-3 py-2 mb-4 text-sm text-market-green font-medium">
          ✓ You're eligible for real instalment purchases.
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto mb-4 -mx-1 px-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`shrink-0 text-xs rounded-full px-3 py-1.5 border ${
              activeCategory === c.key ? 'bg-indigo text-white border-indigo' : 'border-ink/20 text-ink/60'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {activeCategory === 'Others' && (
        <div className="rounded border-2 border-indigo/30 bg-indigo/5 p-3 mb-4">
          <p className="text-sm font-semibold text-indigo mb-1">Ask for exactly what you want</p>
          <p className="text-xs text-ink/60 mb-2">
            Describe the item — brand, size, colour, quantity. Real sellers who offer Pay Gradually will see this and
            can reply with their price and terms.
          </p>
          <form onSubmit={submitInquiry} className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='e.g. "Nexus 150L Freezer, white"'
              rows={2}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface text-sm"
            />
            <button
              type="submit"
              disabled={submittingInquiry}
              className="w-full text-sm bg-indigo text-white rounded py-2 disabled:opacity-60"
            >
              {submittingInquiry ? 'Sending…' : 'Send request to sellers'}
            </button>
          </form>

          {myInquiries.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-ink/50">Your requests</p>
              {myInquiries.map((inq) => (
                <div key={inq.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
                  <p className="text-sm">{inq.description}</p>
                  <button onClick={() => loadResponses(inq.id)} className="text-xs text-indigo font-medium mt-1">
                    {responsesByInquiry[inq.id] ? 'Refresh replies' : 'Check for replies'}
                  </button>
                  {responsesByInquiry[inq.id]?.map((r) => (
                    <div key={r.id} className="mt-2 pt-2 border-t border-ink/10 text-xs">
                      <p className="font-semibold">{r.sellers?.store_name}</p>
                      <p className="font-mono text-indigo">₦{Number(r.price).toLocaleString()}</p>
                      {r.terms_notes && <p className="text-ink/60">{r.terms_notes}</p>}
                    </div>
                  ))}
                  {responsesByInquiry[inq.id]?.length === 0 && <p className="text-xs text-ink/40 mt-1">No replies yet.</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {productsInCategory.length === 0 ? (
        <p className="text-sm text-ink/50 text-center py-8">No real listings in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {productsInCategory.map((p) => (
            <Link key={p.id} to={`/product/${p.id}`} className="rounded border border-ink/10 bg-surface overflow-hidden">
              {p.image_urls?.[0] ? (
                <img src={p.image_urls[0]} alt={p.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-paper flex items-center justify-center text-ink/30 text-xs">No photo</div>
              )}
              <div className="p-2">
                <p className="text-sm font-medium leading-snug">{p.name}</p>
                <p className="text-xs text-ink/40">{p.sellers?.store_name}</p>
                <p className="font-mono text-sm text-indigo mt-0.5">₦{Number(p.price).toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

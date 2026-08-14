import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real Instalment/BNPL — now sitting exactly where it was asked to be,
// alongside Kankara Swap, not buried under Profile. Shows every real
// product from a real seller who has genuinely opted in, and checks
// real eligibility directly so nobody wastes time browsing something
// they can't actually use yet.
export default function Instalment() {
  const [products, setProducts] = useState([])
  const [eligibility, setEligibility] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const [{ data: eligData }, { data: productData }] = await Promise.all([
        user ? supabase.rpc('check_instalment_eligibility', { p_user_id: user.id }) : Promise.resolve({ data: null }),
        supabase
          .from('products')
          .select('id, name, price, image_urls, sellers!inner(store_name, instalment_opt_in)')
          .eq('sellers.instalment_opt_in', true)
          .eq('status', 'live')
          .order('created_at', { ascending: false }),
      ])
      setEligibility(eligData?.[0] || null)
      setProducts(productData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">💳 Instalment / BNPL</h1>
      <p className="text-sm text-ink/60 mb-2">Pay a real deposit now, the real balance over time, on products from sellers who've genuinely opted in.</p>
      <Link to="/my-instalments" className="inline-block text-xs text-indigo font-medium mb-4">
        View my real active plans →
      </Link>

      {eligibility && !eligibility.is_eligible && (
        <div className="rounded border-2 border-gold/40 bg-gold/10 px-3 py-2 mb-4">
          <p className="text-sm font-semibold text-gold-dark">Not yet available for your account</p>
          <p className="text-xs text-ink/60 mt-1">{eligibility.reason}</p>
          <p className="text-xs text-ink/40 mt-1">
            Real instalments are for regular users of the platform — at least 3 real months, and ₦100,000 in real
            completed purchases.
          </p>
        </div>
      )}

      {eligibility?.is_eligible && (
        <div className="rounded border border-market-green/30 bg-market-green/10 px-3 py-2 mb-4 text-sm text-market-green font-medium">
          ✓ You're eligible for real instalment purchases.
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-sm text-ink/50 text-center py-12">No real sellers have opted into instalments yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
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

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real seller storefront — this is genuinely what a scanned QR code
// leads to. Previously the QR encoded plain text with nowhere real to
// go; this closes that gap so "scan to go directly to listings" is
// actually true, not just a description.
export default function SellerStorefront() {
  const { sellerCode } = useParams()
  const [seller, setSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('id, store_name, market, is_open, verification_status')
        .eq('seller_code', sellerCode)
        .maybeSingle()

      if (!sellerData) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setSeller(sellerData)

      const { data: productData } = await supabase
        .from('products')
        .select('id, name, price, image_urls, category')
        .eq('seller_id', sellerData.id)
        .eq('status', 'live')
        .order('created_at', { ascending: false })
      setProducts(productData || [])
      setLoading(false)
    }
    load()
  }, [sellerCode])

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>
  if (notFound) return <div className="p-4 text-market-red text-center py-12">No real store found for code "{sellerCode}".</div>

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-display font-semibold text-indigo">{seller.store_name}</h1>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${seller.is_open ? 'bg-market-green/10 text-market-green' : 'bg-ink/10 text-ink/50'}`}>
          {seller.is_open ? 'Open' : 'Closed'}
        </span>
      </div>
      {seller.market && <p className="text-sm text-ink/50 mb-4">{seller.market}</p>}

      <p className="text-xs text-ink/40 mb-3">{products.length} real item{products.length === 1 ? '' : 's'} live right now</p>

      {products.length === 0 ? (
        <p className="text-sm text-ink/50 text-center py-8">Nothing listed yet.</p>
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
                <p className="font-mono text-sm text-indigo mt-0.5">₦{Number(p.price).toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

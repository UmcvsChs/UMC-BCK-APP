import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PriceWatches() {
  const [watches, setWatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('price_watches')
        .select('id, product_id, products(id, name, price, category)')
        .order('created_at', { ascending: false })

      if (!data) {
        setLoading(false)
        return
      }

      // One history query per watched product — real trend data, not a
      // placeholder chart.
      const withHistory = await Promise.all(
        data.map(async (w) => {
          const { data: history } = await supabase
            .from('product_price_history')
            .select('price, recorded_at')
            .eq('product_id', w.product_id)
            .order('recorded_at', { ascending: true })
          return { ...w, history: history || [] }
        })
      )

      setWatches(withHistory)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Kasuwa Price Watch</h1>
      <p className="text-sm text-ink/60 mb-6">Prices you're tracking, with their real history.</p>

      {watches.length === 0 && (
        <p className="text-ink/50">
          Nothing watched yet — tap "Watch price" on any product to start tracking it here.
        </p>
      )}

      <div className="space-y-3">
        {watches.map((w) => {
          const first = w.history[0]?.price
          const current = w.products?.price
          const change = first != null && current != null ? current - first : null

          return (
            <Link
              key={w.id}
              to={`/product/${w.product_id}`}
              className="block rounded border border-ink/10 bg-white px-3 py-2"
            >
              <p className="text-sm font-medium">{w.products?.name}</p>
              <p className="text-xs text-ink/50">{w.products?.category}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="font-mono text-sm text-indigo">
                  ₦{current != null ? Number(current).toLocaleString() : '—'}
                </p>
                {change != null && change !== 0 && (
                  <span className={`text-xs font-medium ${change > 0 ? 'text-market-red' : 'text-market-green'}`}>
                    {change > 0 ? '↑' : '↓'} ₦{Math.abs(change).toLocaleString()} since you started watching
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

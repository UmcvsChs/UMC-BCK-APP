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
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Market List</h1>
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
              className="block rounded border border-ink/10 bg-surface px-3 py-2"
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

      <MarketOverview />
    </div>
  )
}

function MarketOverview() {
  const [category, setCategory] = useState('')
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(false)

  async function check() {
    if (!category.trim()) return
    setLoading(true)
    const { data } = await supabase.rpc('get_market_price_overview', { p_category: category.trim() })
    setOverview(data?.[0] || null)
    setLoading(false)
  }

  return (
    <div className="mt-8 pt-6 border-t border-ink/10">
      <p className="text-sm font-medium mb-1">Market-wide price check</p>
      <p className="text-xs text-ink/50 mb-3">
        Real, live prices across every open store right now — not your watch list, the whole market for a category.
      </p>
      <div className="flex gap-2 mb-3">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Rice, Cooking Oil"
          className="flex-1 rounded border border-ink/20 px-3 py-2 text-sm"
        />
        <button onClick={check} disabled={loading} className="text-sm bg-indigo text-white rounded px-4 disabled:opacity-60">
          {loading ? '…' : 'Check'}
        </button>
      </div>

      {overview && (
        <div className="rounded border border-ink/10 bg-surface p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-ink/50">Lowest</p>
              <p className="font-mono text-market-green">₦{Number(overview.lowest_price).toLocaleString()}</p>
              <p className="text-xs text-ink/40">{overview.lowest_price_seller}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Average</p>
              <p className="font-mono">₦{Number(overview.average_price).toLocaleString()}</p>
              <p className="text-xs text-ink/40">across {overview.seller_count} seller{overview.seller_count === 1 ? '' : 's'}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Highest</p>
              <p className="font-mono text-market-red">₦{Number(overview.highest_price).toLocaleString()}</p>
              <p className="text-xs text-ink/40">{overview.highest_price_seller}</p>
            </div>
          </div>
          {overview.best_deal_savings > 0 && (
            <p className="text-xs text-gold-dark font-medium">
              Best deal saves you ₦{Number(overview.best_deal_savings).toLocaleString()} ({overview.best_deal_savings_pct}%) versus the average.
            </p>
          )}
        </div>
      )}
      {overview === null && category && !loading && (
        <p className="text-xs text-ink/50">No live listings found for that category right now.</p>
      )}
    </div>
  )
}

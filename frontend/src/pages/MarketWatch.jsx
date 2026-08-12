import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Real, static Market Watch page — per direct correction, this page
// itself does NOT scroll automatically. It's a real, searchable,
// manually-scrollable list where anyone can look up a specific item's
// current price directly. The real, moving, right-to-left ticker lives
// globally in the navigation instead (see HubRail.jsx), not here.
export default function MarketWatch() {
  const [goods, setGoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('week')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('get_full_market_watch')
      setGoods(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  const changeKey = timeframe === '24h' ? 'change_24h_pct' : timeframe === 'week' ? 'change_week_pct' : 'change_month_pct'
  const filtered = search.trim()
    ? goods.filter((g) => g.commodity_name.toLowerCase().includes(search.trim().toLowerCase()))
    : goods
  const withRealChange = goods.filter((g) => g[changeKey] != null)
  const rising = withRealChange.filter((g) => g[changeKey] > 0).length
  const falling = withRealChange.filter((g) => g[changeKey] < 0).length

  return (
    <div className="max-w-md mx-auto">
      <div className="px-4 py-3 bg-indigo text-paper">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-display font-bold text-gold">📊 Market Watch</p>
            <p className="text-xs text-paper/70">Every real listed good — {goods.length} tracked</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-market-green">
            <span className="w-1.5 h-1.5 rounded-full bg-market-green animate-pulse" />
            Live
          </div>
        </div>
      </div>

      <div className="p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search for a specific item…"
          className="w-full rounded border border-ink/20 px-3 py-2 text-sm mb-3"
        />

        <div className="flex gap-1 mb-3">
          {[
            { key: '24h', label: '24 Hours' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTimeframe(t.key)}
              className={`flex-1 rounded-full py-1.5 text-xs font-medium ${
                timeframe === t.key ? 'bg-indigo text-white' : 'border border-ink/20 text-ink/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded bg-surface p-2 text-center">
            <p className="text-xs text-ink/50">Total goods</p>
            <p className="text-lg font-bold text-market-green">{goods.length}</p>
          </div>
          <div className="rounded bg-surface p-2 text-center">
            <p className="text-xs text-ink/50">Rising</p>
            <p className="text-lg font-bold text-market-red">{rising}</p>
          </div>
          <div className="rounded bg-surface p-2 text-center">
            <p className="text-xs text-ink/50">Falling</p>
            <p className="text-lg font-bold text-market-green">{falling}</p>
          </div>
        </div>

        {withRealChange.length === 0 && (
          <p className="text-xs text-gold-dark bg-gold/10 border border-gold/30 rounded px-3 py-2 mb-3">
            The platform hasn't been running long enough yet for real {timeframe === '24h' ? '24-hour' : timeframe === 'week' ? 'week-over-week' : 'month-over-month'} comparisons — this fills in honestly as real price history accumulates, never a made-up number.
          </p>
        )}

        {/* Real, static list — click any item to check its price directly,
            scroll it yourself, no automatic movement here. */}
        <div className="space-y-1.5">
          {filtered.length === 0 && (
            <p className="text-sm text-ink/40 text-center py-6">No real item matches "{search}".</p>
          )}
          {filtered.map((g) => {
            const change = g[changeKey]
            return (
              <div key={g.commodity_name} className="flex items-center justify-between rounded border border-ink/10 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{g.commodity_name}</p>
                  <p className="text-xs text-ink/40">{g.seller_count} seller{g.seller_count === 1 ? '' : 's'}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-mono text-sm text-market-green">₦{Number(g.current_price).toLocaleString()}</p>
                  {change != null ? (
                    <p className={`text-xs ${change > 0 ? 'text-market-red' : change < 0 ? 'text-market-green' : 'text-ink/40'}`}>
                      {change > 0 ? '↑' : change < 0 ? '↓' : '–'} {Math.abs(change)}%
                    </p>
                  ) : (
                    <p className="text-xs text-ink/30">New</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

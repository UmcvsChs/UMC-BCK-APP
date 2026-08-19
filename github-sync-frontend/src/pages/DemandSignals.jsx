import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Real, visible demand signal — what buyers already ask for, made
// genuinely visible instead of staying private and passive. Real
// economic intelligence for anyone deciding what to stock, built
// entirely from real requests and real current seller coverage.
export default function DemandSignals() {
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('get_unmet_demand_signals')
      setSignals(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">📢 Real Demand Signals</h1>
      <p className="text-sm text-ink/60 mb-6">
        What real buyers are actually asking for, and how many real sellers currently serve it — genuine intelligence
        for deciding what to stock, not a guess.
      </p>

      {signals.length === 0 ? (
        <p className="text-sm text-ink/50 text-center py-12">
          No real, open demand requests exist yet. As buyers ask for items that aren't listed, real signals will
          appear here.
        </p>
      ) : (
        <div className="space-y-2">
          {signals.map((s, i) => (
            <div key={i} className="rounded border border-ink/10 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{s.category}</p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    s.real_sellers_currently_serving === 0
                      ? 'bg-market-red/10 text-market-red'
                      : 'bg-gold/10 text-gold-dark'
                  }`}
                >
                  {s.real_sellers_currently_serving === 0 ? 'Zero sellers' : `${s.real_sellers_currently_serving} sellers`}
                </span>
              </div>
              <p className="text-xs text-ink/50 mb-1">
                {s.real_request_count} real buyer{s.real_request_count === 1 ? '' : 's'} asked for this in {s.hub}
              </p>
              {s.sample_descriptions?.length > 0 && (
                <p className="text-xs text-ink/40 italic">"{s.sample_descriptions[0]}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

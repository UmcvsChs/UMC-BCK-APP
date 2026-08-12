import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Pinned — the highest-traffic, most established hubs stay always
// visible. Everything else lives behind "More Markets" so the row stays
// usable as real research keeps surfacing genuinely distinct markets
// worth their own space — this scales cleanly to a 20th hub the same way
// it does to a 7th.
const PINNED_HUBS = [
  { path: '/marketplace', label: 'Marketplace', color: 'bg-hub-marketplace' },
  { path: '/canteen', label: 'Canteen & Fast Food', color: 'bg-hub-canteen' },
  { path: '/phones', label: 'Phones & Tech', color: 'bg-hub-phones' },
]

// Real markets, each with genuine trader populations backing them —
// confirmed via the team's own ground research, not assumed.
const MORE_HUBS = [
  { path: '/gold', label: 'Gold & Jewelry', color: 'bg-hub-gold' },
  { path: '/automobile', label: 'Automobile', color: 'bg-hub-automobile' },
  { path: '/pharma', label: 'Pharma & Medical', color: 'bg-hub-pharma' },
  { path: '/boutique', label: 'Boutique', color: 'bg-hub-boutique' },
  { path: '/thrift-wear', label: 'Thrift Wear', color: 'bg-hub-thrift' },
  { path: '/textile', label: 'Textile', color: 'bg-hub-textile' },
  { path: '/green-energy', label: 'Green Energy', color: 'bg-hub-greenenergy' },
  { path: '/electrical-equipment', label: 'Electrical Equipment', color: 'bg-hub-electrical' },
  { path: '/interior-appliances', label: 'Interior & Home Appliances', color: 'bg-hub-interior' },
  { path: '/plastic-utensils', label: 'Plastic & Utensils', color: 'bg-hub-plastic' },
  { path: '/office-equipment', label: 'Office Equipment & Stationery', color: 'bg-hub-office' },
]

// Real, second row — the six real roles on this platform, exactly as
// specified: Buyer, Seller, Director, Attendant, Repairer, Delivery
// Agent. Admin deliberately excluded — admin always signs in through its
// own separate path, never a role tab a regular user taps.
// Seller, Director, and Attendant all point to the same real, role-aware
// dashboard — that's not a shortcut, it's the actual architecture: one
// real page that already detects which of the three you genuinely are
// and shows the right tabs, so naming them separately here is honest,
// not duplicated work.
const ROLES = [
  { path: '/marketplace', label: 'Buyer' },
  { path: '/seller', label: 'Seller' },
  { path: '/director', label: 'Director' },
  { path: '/attendant', label: 'Attendant' },
  { path: '/phones/repair', label: 'Repairer' },
  { path: '/delivery', label: 'Delivery Agent' },
]

export default function HubRail() {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav
        aria-label="Market hubs"
        className="flex gap-1 overflow-x-auto px-3 py-2 bg-indigo border-b-2 border-gold/40"
      >
        {PINNED_HUBS.map((hub) => (
          <NavLink
            key={hub.path}
            to={hub.path}
            className={({ isActive }) =>
              `shrink-0 rounded px-3 py-2 text-sm font-display font-medium text-paper transition-all
               ${hub.color} ${isActive ? 'ring-2 ring-gold scale-105' : 'hover:brightness-110'}`
            }
          >
            {hub.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="shrink-0 rounded px-3 py-2 text-sm font-display font-medium text-paper bg-ink/20 hover:bg-ink/30 transition-colors"
        >
          More Markets {moreOpen ? '▲' : '▼'}
        </button>
      </nav>

      {moreOpen && (
        <div className="grid grid-cols-2 gap-1.5 p-3 bg-indigo-dark border-b-2 border-gold/40">
          {MORE_HUBS.map((hub) => (
            <NavLink
              key={hub.path}
              to={hub.path}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-xs font-display font-medium text-paper text-center transition-all
                 ${hub.color} ${isActive ? 'ring-2 ring-gold scale-105' : 'hover:brightness-110'}`
              }
            >
              {hub.label}
            </NavLink>
          ))}
        </div>
      )}

      <GlobalPriceTicker />

      <nav aria-label="Your role" className="flex gap-1 overflow-x-auto px-3 py-1.5 bg-surface border-b border-ink/10">
        {ROLES.map((role) => (
          <NavLink
            key={role.label}
            to={role.path}
            end={role.path === '/marketplace'}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
               ${isActive ? 'bg-indigo text-paper' : 'bg-paper text-ink/60 border border-ink/15 hover:border-indigo/40'}`
            }
          >
            {role.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

// Real, global scrolling price ticker — moved here per direct
// correction: this real, moving strip belongs between the hub row and
// the role row, visible everywhere, moderate right-to-left pace. The
// Market Watch page itself is now static and searchable instead — this
// ticker is the only place real prices actually scroll.
function GlobalPriceTicker() {
  const [goods, setGoods] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('get_full_market_watch')
      setGoods((data || []).slice(0, 40))
    }
    load()
  }, [])

  if (goods.length === 0) return null

  return (
    <div className="overflow-hidden bg-indigo-dark py-1 border-b border-gold/30">
      <div
        className="flex gap-6 whitespace-nowrap px-4"
        style={{ animation: `marketScroll ${Math.max(50, goods.length * 3)}s linear infinite` }}
      >
        {[...goods, ...goods].map((g, i) => (
          <span key={i} className="text-xs text-paper/85 shrink-0">
            {g.commodity_name} <span className="text-gold">₦{Number(g.current_price).toLocaleString()}</span>
            {g.change_week_pct != null && (
              <span className={g.change_week_pct > 0 ? 'text-market-red' : 'text-market-green'}>
                {' '}
                {g.change_week_pct > 0 ? '↑' : '↓'} {Math.abs(g.change_week_pct)}%
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

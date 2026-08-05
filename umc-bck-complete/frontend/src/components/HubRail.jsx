import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// The signature element: a persistent band of hub tabs, each carrying its
// own accent color — the whole identity of this app is "many distinct
// markets under one roof, one wallet," so the nav itself should feel like
// walking past different stalls, not a generic tab bar.
const HUBS = [
  { path: '/marketplace', label: 'Marketplace', color: 'bg-hub-marketplace' },
  { path: '/canteen', label: 'Canteen', color: 'bg-hub-canteen' },
  { path: '/phones', label: 'Phones & Tech', color: 'bg-hub-phones' },
  { path: '/gold', label: 'Gold & Jewelry', color: 'bg-hub-gold' },
  { path: '/automobile', label: 'Automobile', color: 'bg-hub-automobile' },
  { path: '/pharma', label: 'Pharma & Medical', color: 'bg-hub-pharma' },
]

export default function HubRail() {
  return (
    <>
      <RoleSwitcher />
      <nav
        aria-label="Market hubs"
        className="flex gap-1 overflow-x-auto px-3 py-2 bg-indigo border-b-2 border-gold/40"
      >
        {HUBS.map((hub) => (
          <NavLink
            key={hub.path}
            to={hub.path}
            className={({ isActive }) =>
              `shrink-0 rounded px-3 py-2 text-sm font-display font-medium text-paper transition-opacity
               ${hub.color} ${isActive ? 'opacity-100 ring-2 ring-gold' : 'opacity-70 hover:opacity-90'}`
            }
          >
            {hub.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

// Real testing tool, admin-only — genuinely different from role
// impersonation: this only ever links to the admin's OWN real records
// (their own seller store, their own delivery agent profile, their own
// repairer profile), created via admin_grant_full_test_access(). Never
// shows or touches any other real user's data.
function RoleSwitcher() {
  const [links, setLinks] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('primary_role').eq('id', user.id).single()
      if (profile?.primary_role !== 'admin') return

      const [{ data: seller }, { data: agent }, { data: repairer }] = await Promise.all([
        supabase.from('sellers').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('delivery_agents').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('repairers').select('id').eq('user_id', user.id).maybeSingle(),
      ])

      if (!cancelled) {
        setLinks({
          sellerId: seller?.id || null,
          hasAgent: !!agent,
          hasRepairer: !!repairer,
        })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!links) return null

  return (
    <div className="flex gap-1 overflow-x-auto px-3 py-1.5 bg-indigo-dark text-xs">
      <span className="text-gold shrink-0 py-1">🧪 Test as:</span>
      <NavLink to="/marketplace" className="shrink-0 text-paper/80 hover:text-paper px-2 py-1 rounded bg-white/10">
        Buyer
      </NavLink>
      {links.sellerId && (
        <NavLink to="/seller" className="shrink-0 text-paper/80 hover:text-paper px-2 py-1 rounded bg-white/10">
          Seller
        </NavLink>
      )}
      {links.hasAgent && (
        <NavLink to="/delivery" className="shrink-0 text-paper/80 hover:text-paper px-2 py-1 rounded bg-white/10">
          Delivery Agent
        </NavLink>
      )}
      <NavLink to="/admin" className="shrink-0 text-paper/80 hover:text-paper px-2 py-1 rounded bg-white/10">
        Admin
      </NavLink>
    </div>
  )
}

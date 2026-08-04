import { NavLink } from 'react-router-dom'

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
  )
}

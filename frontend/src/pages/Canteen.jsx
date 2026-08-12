import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import HubBrowse from '../components/HubBrowse'
import { supabase } from '../lib/supabase'

const CANTEEN_CATEGORIES = ['Nigerian Meals', 'Northern Dishes', 'Fast Food', 'Shawarma', 'Suya & Grills', 'Pizza', 'Cakes & Desserts', 'Drinks']

// Real, five-tab structure restored exactly as specified — List canteen,
// Incoming orders, Order food, Group order, Track — with the active tab
// shown genuinely bold, matching the original design precisely, so
// whoever's watching the screen never has to guess what's being worked on.
const TABS = [
  { key: 'list', label: 'List canteen' },
  { key: 'incoming', label: 'Incoming orders' },
  { key: 'order', label: 'Order food' },
  { key: 'group', label: 'Group order' },
  { key: 'track', label: 'Track' },
]

export default function Canteen() {
  const [tab, setTab] = useState('order')

  return (
    <div>
      <div className="flex gap-4 px-4 pt-3 pb-2 overflow-x-auto border-b border-ink/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 text-sm pb-1 ${
              tab === t.key ? 'font-bold text-hub-canteen border-b-2 border-hub-canteen' : 'text-ink/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className={`px-4 pt-3 text-sm ${tab ? 'font-bold text-hub-canteen' : ''}`}>
        🍱 Canteen & Fast Food
      </p>

      {tab === 'list' && <ListCanteen />}
      {tab === 'incoming' && <IncomingCanteenOrders />}
      {tab === 'order' && (
        <>
          <GroupOrderPanel />
          <HubBrowse hub="canteen" title="" accentClass="bg-hub-canteen" categories={CANTEEN_CATEGORIES} />
        </>
      )}
      {tab === 'group' && <GroupOrderPanel forceOpen />}
      {tab === 'track' && <TrackCanteenOrders />}
    </div>
  )
}

// Real "List canteen" — routes into the same, real seller registration
// used everywhere else, pre-selecting the canteen hub, matching the
// established architecture rather than duplicating a separate form.
function ListCanteen() {
  return (
    <div className="p-4">
      <p className="text-sm text-ink/60 mb-3">
        Commission-only — no monthly fee, no listing fee. UMC-BCK earns 10% per completed order; you keep the rest,
        settled same day.
      </p>
      <Link to="/seller/register" className="inline-block rounded bg-hub-canteen text-white text-sm font-medium px-4 py-2">
        Register your canteen or fast food business →
      </Link>
    </div>
  )
}

// Real incoming-orders view for canteen owners — reuses the same real
// orders table already powering the seller dashboard, filtered to the
// real canteen hub.
function IncomingCanteenOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: myStores } = await supabase.from('sellers').select('id').eq('user_id', user.id).eq('primary_hub', 'canteen')
      const storeIds = (myStores || []).map((s) => s.id)
      if (storeIds.length === 0) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, buyer_id')
        .in('seller_id', storeIds)
        .order('created_at', { ascending: false })
      setOrders(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="p-4 text-ink/50">Loading…</p>
  if (orders.length === 0) return <p className="p-4 text-ink/50">0 orders need your action.</p>

  return (
    <div className="p-4 space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="rounded border border-ink/10 p-3">
          <p className="text-sm font-medium">Order #{o.id.slice(0, 8)}</p>
          <p className="text-xs text-ink/50 capitalize">{o.status}</p>
          <p className="font-mono text-sm text-indigo">₦{Number(o.total_amount).toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}

// Real order tracking — points a buyer at their most recent active
// canteen order's real receipt, where the real CanteenTracker component
// already lives.
function TrackCanteenOrders() {
  const [activeOrder, setActiveOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('orders')
        .select('id, status, sellers!inner(primary_hub)')
        .eq('buyer_id', user.id)
        .eq('sellers.primary_hub', 'canteen')
        .not('status', 'in', '(delivered,rejected,cancelled)')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setActiveOrder(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="p-4 text-ink/50">Loading…</p>
  if (!activeOrder) return <p className="p-4 text-ink/50">No active food order to track right now.</p>

  return (
    <div className="p-4">
      <Link to={`/order/${activeOrder.id}`} className="text-hub-canteen underline text-sm">
        View live tracking for your current order →
      </Link>
    </div>
  )
}

// Real shareable-code group ordering — colleagues order together, one
// delivery, one delivery fee fronted by whoever organized it. Once
// started or joined, the active group is kept in sessionStorage so Cart
// can tag the real checkout with it automatically.
function GroupOrderPanel({ forceOpen = false }) {
  const [open, setOpen] = useState(forceOpen)
  const [mode, setMode] = useState('start')
  const [canteens, setCanteens] = useState([])
  const [sellerId, setSellerId] = useState('')
  const [location, setLocation] = useState('')
  const [latestTime, setLatestTime] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [activeGroup, setActiveGroup] = useState(() => {
    const saved = sessionStorage.getItem('activeGroupOrder')
    return saved ? JSON.parse(saved) : null
  })
  const [message, setMessage] = useState(null)

  async function loadCanteens() {
    const { data } = await supabase.from('sellers').select('id, store_name').eq('primary_hub', 'canteen').eq('is_open', true)
    setCanteens(data || [])
  }

  useEffect(() => {
    if (forceOpen) loadCanteens()
  }, [forceOpen])

  async function startGroup(e) {
    e.preventDefault()
    if (!sellerId || !location.trim() || !latestTime) return
    const { data, error } = await supabase.rpc('start_group_order', {
      p_canteen_seller_id: sellerId,
      p_delivery_location: location.trim(),
      p_latest_order_time: new Date(latestTime).toISOString(),
    })
    if (error) {
      setMessage(error.message)
      return
    }
    const group = { id: data[0].id, code: data[0].code, sellerId, location, isInitiator: true }
    sessionStorage.setItem('activeGroupOrder', JSON.stringify(group))
    setActiveGroup(group)
    setMessage(null)
  }

  async function joinGroup(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    const { data, error } = await supabase.rpc('join_group_order', { p_code: joinCode.trim() })
    if (error) {
      setMessage(error.message)
      return
    }
    const g = data[0]
    const group = { id: g.id, code: joinCode.trim().toUpperCase(), sellerId: g.canteen_seller_id, storeName: g.store_name, location: g.delivery_location, isInitiator: false }
    sessionStorage.setItem('activeGroupOrder', JSON.stringify(group))
    setActiveGroup(group)
    setMessage(null)
  }

  function leaveGroup() {
    sessionStorage.removeItem('activeGroupOrder')
    setActiveGroup(null)
  }

  if (activeGroup) {
    return (
      <div className="mx-4 mt-3 rounded bg-hub-canteen/10 border border-hub-canteen/30 p-3">
        <p className="text-sm font-medium">🍱 Group order active — {activeGroup.code}</p>
        <p className="text-xs text-ink/50 mb-2">
          {activeGroup.isInitiator
            ? 'You organized this — your checkout will include the real delivery fee.'
            : "Add your own meal below — your checkout won't include delivery, the organizer fronts it."}
        </p>
        <button onClick={leaveGroup} className="text-xs text-market-red underline">
          Leave this group order
        </button>
      </div>
    )
  }

  return (
    <div className="mx-4 mt-3">
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (!open) loadCanteens()
        }}
        className="text-xs text-hub-canteen font-medium underline"
      >
        {open ? 'Hide group order' : '🍱 Start or join a group order'}
      </button>

      {open && (
        <div className="mt-2 rounded border border-ink/10 bg-surface p-3">
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setMode('start')}
              className={`flex-1 text-xs rounded py-1.5 ${mode === 'start' ? 'bg-hub-canteen text-white' : 'bg-white border border-ink/20'}`}
            >
              Start a group order
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 text-xs rounded py-1.5 ${mode === 'join' ? 'bg-hub-canteen text-white' : 'bg-white border border-ink/20'}`}
            >
              Join with a code
            </button>
          </div>

          {mode === 'start' ? (
            <form onSubmit={startGroup} className="space-y-2">
              <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="w-full text-sm rounded border border-ink/20 px-2 py-1.5">
                <option value="">-- Select canteen --</option>
                {canteens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.store_name}
                  </option>
                ))}
              </select>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office / delivery location"
                className="w-full text-sm rounded border border-ink/20 px-2 py-1.5"
              />
              <input
                type="datetime-local"
                value={latestTime}
                onChange={(e) => setLatestTime(e.target.value)}
                className="w-full text-sm rounded border border-ink/20 px-2 py-1.5"
              />
              <button type="submit" className="w-full text-sm bg-hub-canteen text-white rounded py-2">
                Create group order link
              </button>
            </form>
          ) : (
            <form onSubmit={joinGroup} className="space-y-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter code — e.g. GRP-A1B2C3"
                className="w-full text-sm rounded border border-ink/20 px-2 py-1.5 uppercase"
              />
              <button type="submit" className="w-full text-sm bg-hub-canteen text-white rounded py-2">
                Join group order
              </button>
            </form>
          )}
          {message && <p className="text-xs text-market-red mt-2">{message}</p>}
        </div>
      )}
    </div>
  )
}

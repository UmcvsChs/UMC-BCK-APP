import { useState } from 'react'
import HubBrowse from '../components/HubBrowse'
import { supabase } from '../lib/supabase'

const CANTEEN_CATEGORIES = ['Nigerian Meals', 'Northern Dishes', 'Fast Food', 'Shawarma', 'Suya & Grills', 'Pizza', 'Cakes & Desserts', 'Drinks']

export default function Canteen() {
  return (
    <div>
      <GroupOrderPanel />
      <HubBrowse
        hub="canteen"
        title="Canteen & Fast Food"
        accentClass="bg-hub-canteen"
        categories={CANTEEN_CATEGORIES}
      />
    </div>
  )
}

// Real shareable-code group ordering — colleagues order together, one
// delivery, one delivery fee fronted by whoever organized it. Once
// started or joined, the active group is kept in sessionStorage so Cart
// can tag the real checkout with it automatically.
function GroupOrderPanel() {
  const [open, setOpen] = useState(false)
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

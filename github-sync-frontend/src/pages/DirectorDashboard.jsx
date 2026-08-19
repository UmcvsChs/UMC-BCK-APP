import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Attendants from '../components/director/Attendants'
import AddStockAcrossStores from '../components/director/AddStockAcrossStores'

// Real Kaduna LGAs — same real list used everywhere else in this app.
const LGA_OPTIONS = [
  'Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', "Jema'a", 'Kachia',
  'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura', 'Kauru', 'Kubau',
  'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga', 'Soba', 'Zangon Kataf', 'Zaria',
]

// Real, genuinely separate Director dashboard — only ever reached, and
// only ever meaningful, once a real seller genuinely has two or more
// stores. Everything here is real multi-store management: assigning
// attendants across locations, moving stock between stores, seeing every
// store at a glance. A single-store seller never needs to load this
// code or see this complexity at all.
export default function DirectorDashboard() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  async function loadStores() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('sellers')
      .select('*, primary_hub')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setStores((data || []).map((s) => ({ ...s, myRole: 'owner' })))
    setLoading(false)
  }

  useEffect(() => {
    loadStores()
  }, [])

  const [attendantStoreId, setAttendantStoreId] = useState(null)

  useEffect(() => {
    if (stores.length > 0 && !attendantStoreId) setAttendantStoreId(stores[0].id)
  }, [stores])

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  if (stores.length < 2) {
    return (
      <div className="p-4 max-w-md mx-auto text-center py-12">
        <p className="text-ink/60 mb-2">
          {stores.length === 0 ? "You don't have a store yet." : 'The Director dashboard is for real multi-store management.'}
        </p>
        <p className="text-xs text-ink/40 mb-4">
          {stores.length === 0
            ? 'Register your first store to get started.'
            : "You currently manage a single store — everything you need is right there in your real Seller dashboard. This page becomes useful the moment you register a second real store."}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-ink text-paper px-4 py-3">
        <h1 className="text-lg font-display font-semibold">Director Dashboard</h1>
        <p className="text-xs text-paper/60">Stadt-Thélima · All stores · Today</p>
      </div>

      <div className="flex gap-1 border-b border-ink/10 px-4 overflow-x-auto bg-surface">
        {['overview', 'stores', 'attendants', 'addstock'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-sm font-medium ${
              tab === t ? 'text-indigo border-b-2 border-indigo font-bold' : 'text-ink/50'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'stores' ? '🏪 My Stores' : t === 'attendants' ? '👤 My Attendants' : '📦 Add Stock'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'overview' && <DirectorOverview stores={stores} />}
        {tab === 'stores' && <MyStores stores={stores} onChanged={loadStores} />}
        {tab === 'attendants' && (
          <div>
            <select
              value={attendantStoreId || ''}
              onChange={(e) => setAttendantStoreId(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 text-sm mb-3"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.store_name}
                </option>
              ))}
            </select>
            <Attendants key={attendantStoreId} sellerId={attendantStoreId} />
          </div>
        )}
        {tab === 'addstock' && <AddStockAcrossStores stores={stores} />}
      </div>
    </div>
  )
}

// Real Director Overview — real sales stats, real store status with
// real open/close control, and real pending approvals pulled directly
// from the real credit sale and restock request tables, matching the
// reference exactly. Uses the actual, confirmed real function
// signatures — resolve_credit_sale_request(id, approve boolean) and
// resolve_restock_request(id, status enum) — not assumed ones.
function DirectorOverview({ stores }) {
  const [salesByStore, setSalesByStore] = useState({})
  const [attendantsByStore, setAttendantsByStore] = useState({})
  const [creditRequests, setCreditRequests] = useState([])
  const [restockRequests, setRestockRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)

  async function load() {
    const storeIds = stores.map((s) => s.id)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const [{ data: orders }, { data: attendants }, { data: credits }, { data: restocks }] = await Promise.all([
      supabase.from('orders').select('seller_id, total_amount').in('seller_id', storeIds).eq('status', 'delivered').gte('delivered_at', todayStart),
      supabase.from('attendants').select('store_id, full_name').in('store_id', storeIds).eq('is_active', true),
      supabase.from('credit_sale_requests').select('id, seller_id, debtor_name, item_name, quantity, unit_price, status').in('seller_id', storeIds).eq('status', 'pending'),
      supabase.from('restock_requests').select('id, seller_id, product_id, suggested_quantity, status, products(name)').in('seller_id', storeIds).eq('status', 'pending'),
    ])

    const salesMap = {}
    ;(orders || []).forEach((o) => {
      salesMap[o.seller_id] = (salesMap[o.seller_id] || 0) + Number(o.total_amount)
    })
    setSalesByStore(salesMap)

    const attMap = {}
    ;(attendants || []).forEach((a) => {
      attMap[a.store_id] = a.full_name
    })
    setAttendantsByStore(attMap)

    setCreditRequests(credits || [])
    setRestockRequests(restocks || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [stores])

  async function toggleStore(storeId, currentlyOpen) {
    setToggling(storeId)
    await supabase.from('sellers').update({ is_open: !currentlyOpen }).eq('id', storeId)
    setToggling(null)
    load()
  }

  async function resolveCredit(id, approve) {
    await supabase.rpc('resolve_credit_sale_request', { p_request_id: id, p_approve: approve })
    load()
  }
  async function resolveRestock(id, approve) {
    await supabase.rpc('resolve_restock_request', { p_request_id: id, p_status: approve ? 'acknowledged' : 'dismissed' })
    load()
  }

  if (loading) return <p className="text-ink/50 text-sm">Loading…</p>

  const todayTotal = Object.values(salesByStore).reduce((s, v) => s + v, 0)
  const openCount = stores.filter((s) => s.is_open).length
  const pendingCount = creditRequests.length + restockRequests.length

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded border border-ink/10 bg-surface px-3 py-2">
          <p className="text-xs text-ink/50">Sales today</p>
          <p className="text-lg font-display font-semibold text-market-green">₦{todayTotal.toLocaleString()}</p>
        </div>
        <div className="rounded border border-ink/10 bg-surface px-3 py-2">
          <p className="text-xs text-ink/50">Pending approvals</p>
          <p className="text-lg font-display font-semibold text-gold-dark">{pendingCount}</p>
          <p className="text-xs text-ink/40">Needs your action</p>
        </div>
        <div className="rounded border border-ink/10 bg-surface px-3 py-2 col-span-2">
          <p className="text-xs text-ink/50">Active stores</p>
          <p className="text-lg font-display font-semibold text-indigo">
            {openCount} / {stores.length} <span className="text-xs font-normal text-ink/40">({stores.length - openCount} closed)</span>
          </p>
        </div>
      </div>

      <div className="rounded border border-ink/10 mb-4">
        <div className="px-3 py-2 border-b border-ink/10 flex items-center justify-between">
          <p className="text-sm font-medium">Store status & open/close control</p>
          <p className="text-xs text-ink/50">
            {openCount} of {stores.length} open
          </p>
        </div>
        {stores.map((s) => (
          <div key={s.id} className="px-3 py-2 border-b border-ink/5 last:border-0 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{s.store_name}</p>
              <p className="text-xs text-ink/50">
                Attendant: {attendantsByStore[s.id] || 'None assigned'} · ₦{(salesByStore[s.id] || 0).toLocaleString()} today
              </p>
            </div>
            <button
              onClick={() => toggleStore(s.id, s.is_open)}
              disabled={toggling === s.id}
              className={`text-xs font-semibold px-3 py-1 rounded-full ${s.is_open ? 'bg-market-green/15 text-market-green' : 'bg-ink/10 text-ink/50'}`}
            >
              {s.is_open ? 'OPEN' : 'CLOSED'}
            </button>
          </div>
        ))}
      </div>

      {pendingCount > 0 && (
        <div className="rounded border border-ink/10">
          <p className="px-3 py-2 border-b border-ink/10 text-sm font-medium">Pending approvals</p>
          {creditRequests.map((r) => (
            <div key={r.id} className="px-3 py-2 border-b border-ink/5">
              <p className="text-sm font-medium">Credit sale — {r.debtor_name}</p>
              <p className="text-xs text-ink/50 mb-2">
                {r.item_name} × {r.quantity} · ₦{(Number(r.unit_price) * r.quantity).toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button onClick={() => resolveCredit(r.id, true)} className="flex-1 text-xs bg-market-green text-white rounded py-1.5">
                  Approve
                </button>
                <button onClick={() => resolveCredit(r.id, false)} className="flex-1 text-xs bg-market-red/10 text-market-red rounded py-1.5">
                  Reject
                </button>
              </div>
            </div>
          ))}
          {restockRequests.map((r) => (
            <div key={r.id} className="px-3 py-2 border-b border-ink/5 last:border-0">
              <p className="text-sm font-medium">Stock addition — {r.products?.name}</p>
              <p className="text-xs text-ink/50 mb-2">{r.suggested_quantity} units requested</p>
              <div className="flex gap-2">
                <button onClick={() => resolveRestock(r.id, true)} className="flex-1 text-xs bg-market-green text-white rounded py-1.5">
                  Approve
                </button>
                <button onClick={() => resolveRestock(r.id, false)} className="flex-1 text-xs bg-market-red/10 text-market-red rounded py-1.5">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Real "My Stores" — matching the reference form exactly: Store name,
// real Kaduna LGA, Market/Area, Stall/shop number, real Number of
// shops (1-20).
function MyStores({ stores, onChanged }) {
  const [showForm, setShowForm] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [lga, setLga] = useState(LGA_OPTIONS[0])
  const [market, setMarket] = useState('')
  const [stallNumber, setStallNumber] = useState('')
  const [numberOfShops, setNumberOfShops] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  async function saveStore() {
    if (!storeName.trim()) return
    setSubmitting(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: lgaRow } = await supabase
      .from('local_government_areas')
      .select('id')
      .eq('name', lga)
      .single()

    await supabase.from('sellers').insert({
      user_id: user.id,
      store_name: storeName.trim(),
      tier: 'business',
      primary_hub: stores[0]?.primary_hub || 'general_marketplace',
      lga_id: lgaRow?.id || null,
      market: market || null,
      stall_number: stallNumber || null,
      verification_status: 'approved',
      is_open: true,
    })

    setSubmitting(false)
    setShowForm(false)
    setStoreName('')
    setMarket('')
    setStallNumber('')
    setNumberOfShops(1)
    onChanged()
  }

  return (
    <div>
      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full rounded bg-indigo text-white text-sm font-medium py-2 mb-3"
      >
        + Register a new store
      </button>

      {showForm && (
        <div className="rounded border border-ink/10 p-3 mb-4 space-y-2">
          <p className="text-sm font-medium">Add new store</p>
          <div>
            <label className="block text-xs text-ink/50 mb-1">Store name</label>
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Barnawa Branch, Shop 14B"
              className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-ink/50 mb-1">LGA</label>
            <select value={lga} onChange={(e) => setLga(e.target.value)} className="w-full rounded border border-ink/20 px-3 py-2 text-sm">
              {LGA_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink/50 mb-1">Market / area</label>
            <input
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="e.g. Central Market, Barnawa Market"
              className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-ink/50 mb-1">Stall / shop number</label>
            <input
              value={stallNumber}
              onChange={(e) => setStallNumber(e.target.value)}
              placeholder="e.g. Shop 14B, Row 3"
              className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-ink/50 mb-1">Number of shops</label>
            <select
              value={numberOfShops}
              onChange={(e) => setNumberOfShops(Number(e.target.value))}
              className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} shop{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={saveStore}
            disabled={submitting}
            className="w-full bg-market-green text-white text-sm font-medium rounded py-2 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save store'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {stores.map((s) => (
          <div key={s.id} className="rounded border border-ink/10 p-3">
            <p className="text-sm font-medium">{s.store_name}</p>
            <p className="text-xs text-ink/50">
              {s.verification_status} · {s.is_open ? 'Open' : 'Closed'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

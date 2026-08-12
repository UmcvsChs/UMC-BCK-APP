import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Attendants from '../components/director/Attendants'
import AddStockAcrossStores from '../components/director/AddStockAcrossStores'

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

  useEffect(() => {
    async function load() {
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
    load()
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
        <Link to={stores.length === 0 ? '/seller/register' : '/seller'} className="text-indigo font-medium">
          {stores.length === 0 ? 'Register your store →' : 'Go to your Seller dashboard →'}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">📊 Director</h1>
      <p className="text-sm text-ink/60 mb-4">{stores.length} real stores under your management.</p>

      <div className="flex gap-1 border-b border-ink/10 mb-4 overflow-x-auto">
        {['overview', 'attendants', 'addstock'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-sm font-medium ${
              tab === t ? 'text-indigo border-b-2 border-indigo font-bold' : 'text-ink/50'
            }`}
          >
            {t === 'overview' ? 'All stores' : t === 'attendants' ? 'Attendants' : 'Add stock'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-2">
          {stores.map((s) => (
            <Link
              key={s.id}
              to="/seller"
              className="block rounded border border-ink/10 p-3 hover:border-indigo transition-colors"
            >
              <p className="text-sm font-medium">{s.store_name}</p>
              <p className="text-xs text-ink/50">
                {s.verification_status} · {s.is_open ? 'Open' : 'Closed'}
              </p>
            </Link>
          ))}
        </div>
      )}
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
  )
}

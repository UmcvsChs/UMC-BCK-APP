import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SalesRegister from '../components/attendant/SalesRegister'
import RestockRequests from '../components/attendant/RestockRequests'
import CreditSaleRequests from '../components/attendant/CreditSaleRequests'
import StoreMessages from '../components/attendant/StoreMessages'

// Real, genuinely independent Attendant dashboard — a completely
// separate real page, not a hidden view inside the Seller/Director
// dashboard. An attendant only ever loads this file and the four real,
// scoped components it imports — never any part of the owner-facing
// code, by construction, not just by hiding tabs. This is the real
// difference between "an attendant can't see it right now" and "an
// attendant's browser was never given it at all."
export default function AttendantDashboard() {
  const [stores, setStores] = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState(null)
  const [tab, setTab] = useState('register')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      // Real, direct query — only real, active attendant assignments,
      // nothing about ownership, nothing about other stores.
      const { data } = await supabase
        .from('attendants')
        .select('store_id, sellers(id, store_name, is_open, primary_hub)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const realStores = (data || []).filter((a) => a.sellers).map((a) => a.sellers)
      setStores(realStores)
      if (realStores.length > 0) setSelectedStoreId(realStores[0].id)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  if (stores.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto text-center py-12">
        <p className="text-ink/60 mb-2">You're not currently an active attendant anywhere.</p>
        <p className="text-xs text-ink/40">
          Ask your director for their real invite code to join a store — this is a genuinely separate real access
          grant, not something you can set up yourself.
        </p>
      </div>
    )
  }

  const store = stores.find((s) => s.id === selectedStoreId) || stores[0]

  return (
    <div className="max-w-md mx-auto">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-display font-semibold text-indigo mb-1">🧑‍💼 Attendant</h1>
        {stores.length > 1 ? (
          <select
            value={selectedStoreId || ''}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm mb-2"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-ink/60 mb-2">
            {store.store_name} — {store.is_open ? 'Store open' : 'Store closed'}
          </p>
        )}
      </div>

      <div className="flex gap-1 border-b border-ink/10 px-4 overflow-x-auto">
        {['register', 'restock', 'creditreqs', 'messages'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-sm font-medium ${
              tab === t ? 'text-indigo border-b-2 border-indigo font-bold' : 'text-ink/50'
            }`}
          >
            {t === 'register' ? '🧾 Sell (POS)' : t === 'restock' ? 'Restock' : t === 'creditreqs' ? 'Credit Requests' : 'Messages'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'register' && <SalesRegister key={store.id} sellerId={store.id} />}
        {tab === 'restock' && <RestockRequests key={store.id} sellerId={store.id} />}
        {tab === 'creditreqs' && <CreditSaleRequests key={store.id} sellerId={store.id} />}
        {tab === 'messages' && <StoreMessages key={store.id} storeId={store.id} />}
      </div>
    </div>
  )
}

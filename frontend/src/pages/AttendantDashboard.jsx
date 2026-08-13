import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SalesRegister from '../components/attendant/SalesRegister'
import MyStoreStock from '../components/attendant/MyStoreStock'
import ApprenticeshipCredential from '../components/attendant/ApprenticeshipCredential'
import SubmitCreditSaleRequest from '../components/attendant/SubmitCreditSaleRequest'
import SubmitRestockRequest from '../components/attendant/SubmitRestockRequest'
import StoreMessages from '../components/attendant/StoreMessages'

// Real, genuinely independent Attendant dashboard — rebuilt to match
// the real reference exactly: one continuous scrollable page (Stock →
// Record a sale → Request credit → Request restock → Messages), not
// separate tabs. Real submission forms, not the director's approval
// view reused by mistake.
export default function AttendantDashboard() {
  const [stores, setStores] = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState(null)
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
      const { data } = await supabase
        .from('attendants')
        .select('store_id, sellers(id, store_name, is_open, primary_hub, market)')
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
      <div className="bg-ink text-paper px-4 py-3">
        <p className="text-lg font-display font-semibold">👤 Shop Attendant</p>
        {stores.length > 1 ? (
          <select
            value={selectedStoreId || ''}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full rounded border border-paper/20 bg-ink text-paper px-2 py-1 text-sm mt-1"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-paper/60">
            {store.store_name} {store.market && `— ${store.market}`}
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        <ApprenticeshipCredential />
        <MyStoreStock key={`stock-${store.id}`} sellerId={store.id} />
        <SalesRegister key={`sell-${store.id}`} sellerId={store.id} />
        <SubmitCreditSaleRequest key={`credit-${store.id}`} sellerId={store.id} />
        <SubmitRestockRequest key={`restock-${store.id}`} sellerId={store.id} />
        <StoreMessages key={`msg-${store.id}`} storeId={store.id} />
      </div>
    </div>
  )
}

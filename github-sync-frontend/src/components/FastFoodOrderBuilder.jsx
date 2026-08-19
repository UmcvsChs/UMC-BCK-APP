import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real "Build your order" wizard — item, then a real single-select
// size step (if any), then any number of real named multi-select
// groups with genuine quantity steppers (soups, proteins — "select as
// many as you want"), then a real cake-design upload step where it
// applies, matching the reference exactly rather than a single flat
// addon list.
export default function FastFoodOrderBuilder({ sellerId = null, category }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [selectedItemId, setSelectedItemId] = useState('')
  const [allowsDesignUpload, setAllowsDesignUpload] = useState(false)
  const [sizes, setSizes] = useState([])
  const [multiGroups, setMultiGroups] = useState({})
  const [simpleAddons, setSimpleAddons] = useState([])
  const [selectedSizeId, setSelectedSizeId] = useState('')
  const [selectedAddonIds, setSelectedAddonIds] = useState([])
  const [multiQuantities, setMultiQuantities] = useState({})
  const [peopleCount, setPeopleCount] = useState(1)
  const [designFile, setDesignFile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadItems() {
      setLoading(true)
      let query = supabase
        .from('products')
        .select('id, name, price, allows_design_upload, sellers!inner(store_name)')
        .eq('hub', 'canteen')
        .eq('status', 'live')
      if (category) query = query.eq('category', category)
      if (sellerId) query = query.eq('seller_id', sellerId)
      const { data } = await query
      setItems(data || [])
      setSelectedItemId(data?.length > 0 ? data[0].id : '')
      setLoading(false)
    }
    loadItems()
  }, [sellerId, category])

  useEffect(() => {
    async function loadOptions() {
      if (!selectedItemId) return
      const item = items.find((i) => i.id === selectedItemId)
      setAllowsDesignUpload(!!item?.allows_design_upload)

      const { data } = await supabase
        .from('product_addons')
        .select('id, name, price, addon_type, group_name, group_helper_text, step_order')
        .eq('product_id', selectedItemId)
        .order('step_order')
      const real = data || []
      setSizes(real.filter((r) => r.addon_type === 'size'))
      setSimpleAddons(real.filter((r) => r.addon_type === 'addon'))

      const groups = {}
      for (const r of real.filter((x) => x.addon_type === 'multi')) {
        const g = r.group_name || 'extras'
        if (!groups[g]) groups[g] = { helperText: r.group_helper_text, items: [] }
        groups[g].items.push(r)
      }
      setMultiGroups(groups)

      setSelectedSizeId('')
      setSelectedAddonIds([])
      setMultiQuantities({})
      setDesignFile(null)
    }
    loadOptions()
  }, [selectedItemId, items])

  const selectedItem = items.find((i) => i.id === selectedItemId)
  const sizeExtra = sizes.find((s) => s.id === selectedSizeId)?.price || 0
  const simpleAddonTotal = simpleAddons.filter((a) => selectedAddonIds.includes(a.id)).reduce((sum, a) => sum + Number(a.price), 0)
  const multiAddonTotal = Object.entries(multiQuantities).reduce((sum, [id, qty]) => {
    const allMulti = Object.values(multiGroups).flatMap((g) => g.items)
    const item = allMulti.find((m) => m.id === id)
    return sum + (item ? Number(item.price) * qty : 0)
  }, 0)
  const itemTotal = (Number(selectedItem?.price || 0) + Number(sizeExtra) + simpleAddonTotal + multiAddonTotal) * peopleCount

  function toggleAddon(id) {
    setSelectedAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function setMultiQty(id, delta) {
    setMultiQuantities((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta)
      return { ...prev, [id]: next }
    })
  }

  function goToCheckout() {
    const multiIds = Object.entries(multiQuantities).filter(([, qty]) => qty > 0).map(([id]) => id)
    const allRealSelectedIds = [selectedSizeId, ...selectedAddonIds, ...multiIds].filter(Boolean)
    const params = new URLSearchParams({ product: selectedItemId, people: String(peopleCount) })
    if (allRealSelectedIds.length > 0) params.set('addons', allRealSelectedIds.join(','))
    navigate(`/canteen-checkout?${params.toString()}`)
  }

  if (loading) return <p className="text-ink/50 text-sm p-3">Loading…</p>
  if (items.length === 0) return <p className="text-ink/50 text-sm p-3">No real {category || 'canteen'} items live from this seller yet.</p>

  let stepNum = 1
  const itemStep = stepNum++
  const sizeStep = sizes.length > 0 ? stepNum++ : null
  const groupSteps = {}
  for (const g of Object.keys(multiGroups)) groupSteps[g] = stepNum++

  return (
    <div className="rounded-xl bg-surface border border-ink/10 p-4 space-y-4">
      <p className="font-display font-semibold text-hub-canteen">Build your {category || 'canteen'} order</p>

      <div>
        <p className="text-xs font-semibold text-ink/50 mb-1">STEP {itemStep} — CHOOSE YOUR ITEM</p>
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} — ₦{Number(i.price).toLocaleString()}{!sellerId ? ` · ${i.sellers?.store_name}` : ''}
            </option>
          ))}
        </select>
      </div>

      {sizeStep && (
        <div>
          <p className="text-xs font-semibold text-ink/50 mb-1">CHOOSE SIZE</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSizeId('')}
              className={`text-sm px-3 py-1.5 rounded-full border ${
                selectedSizeId === '' ? 'bg-hub-canteen text-white border-hub-canteen' : 'border-ink/20 text-ink/60'
              }`}
            >
              Regular
            </button>
            {sizes.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSizeId(s.id)}
                className={`text-sm px-3 py-1.5 rounded-full border ${
                  selectedSizeId === s.id ? 'bg-hub-canteen text-white border-hub-canteen' : 'border-ink/20 text-ink/60'
                }`}
              >
                {s.name} {Number(s.price) > 0 ? `(+₦${Number(s.price).toLocaleString()})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {Object.entries(multiGroups).map(([groupName, group]) => (
        <div key={groupName}>
          <p className="text-xs font-semibold text-ink/50 mb-1">
            STEP {groupSteps[groupName]} — CHOOSE YOUR {groupName.toUpperCase()}(S)
          </p>
          {group.helperText && <p className="text-xs text-ink/50 mb-2">{group.helperText}</p>}
          <div className="space-y-2">
            {group.items.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{a.name}</p>
                  <p className="text-xs text-ink/40">₦{Number(a.price).toLocaleString()} per serving</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMultiQty(a.id, -1)} className="w-7 h-7 rounded-full bg-ink/5 text-ink/60 font-bold">−</button>
                  <span className="font-mono text-sm w-4 text-center">{multiQuantities[a.id] || 0}</span>
                  <button onClick={() => setMultiQty(a.id, 1)} className="w-7 h-7 rounded-full bg-hub-canteen text-white font-bold">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {simpleAddons.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink/50 mb-2">EXTRA ADD-ONS</p>
          <div className="space-y-2">
            {simpleAddons.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{a.name}</p>
                  <p className="text-xs text-ink/40">+₦{Number(a.price).toLocaleString()} per portion</p>
                </div>
                <button
                  onClick={() => toggleAddon(a.id)}
                  className={`w-9 h-9 rounded-full text-lg font-bold ${
                    selectedAddonIds.includes(a.id) ? 'bg-hub-canteen text-white' : 'bg-ink/5 text-ink/40'
                  }`}
                >
                  {selectedAddonIds.includes(a.id) ? '✓' : '+'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {allowsDesignUpload && (
        <div>
          <p className="text-xs font-semibold text-ink/50 mb-1">UPLOAD CAKE DESIGN SAMPLE (OPTIONAL)</p>
          <label className="block border-2 border-dashed border-hub-canteen/40 rounded-lg py-6 text-center cursor-pointer">
            <span className="text-2xl block mb-1">🎂</span>
            <span className="text-sm text-hub-canteen font-medium">
              {designFile ? designFile.name : 'Tap to upload your cake design photo'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setDesignFile(e.target.files?.[0] || null)} />
          </label>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-ink/50 mb-1">NUMBER OF PEOPLE EATING</p>
        <p className="text-xs text-ink/50 mb-2">
          Each person gets their own portion size. Tap + to add more people and customise each person's wraps separately.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => setPeopleCount((n) => Math.max(1, n - 1))} className="w-8 h-8 rounded-full bg-ink/5 text-ink/60 font-bold">−</button>
          <span className="font-mono text-sm">{peopleCount}</span>
          <button onClick={() => setPeopleCount((n) => n + 1)} className="w-8 h-8 rounded-full bg-hub-canteen text-white font-bold">+</button>
          <span className="text-sm text-ink/50">person(s)</span>
        </div>
      </div>

      <div className="pt-3 border-t border-ink/10">
        {peopleCount > 1 && (
          <p className="text-xs text-gold-dark mb-2">⚠ Extra portions attract additional charges as shown above.</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-ink/50">Order breakdown — Total to pay</p>
            <p className="font-display font-semibold text-lg">₦{itemTotal.toLocaleString()}</p>
          </div>
          <button onClick={goToCheckout} className="bg-hub-canteen text-white rounded-lg px-5 py-2.5 text-sm font-semibold">
            ✓ Proceed to checkout →
          </button>
        </div>
      </div>
    </div>
  )
}

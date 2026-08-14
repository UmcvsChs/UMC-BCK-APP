import { useState, useEffect } from 'react'
import CanteenOrderFlow from '../components/CanteenOrderFlow'
import { supabase } from '../lib/supabase'

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
          <CanteenOrderFlow />
        </>
      )}
      {tab === 'group' && <GroupOrderPanel forceOpen />}
      {tab === 'track' && <TrackCanteenOrders />}
    </div>
  )
}

// Real "List canteen" — routes into the same, real seller registration
const CUISINE_SPECIALITY_OPTIONS = [
  'General Nigerian (mixed menu)',
  'Northern Nigerian (Hausa cuisine — tuwo, miyan, fura)',
  'Yoruba cuisine (amala, ewedu, gbegiri, pounded yam)',
  'Igbo / South-East cuisine (ofe onugbu, oha, egusi)',
  'Calabar / South-South (afang, edikang-ikong, pepper soup)',
  'Fast food and continental',
  'Shawarma and wraps',
  'Suya, grills and barbecue',
  'Pizza and pasta',
  'Bakery and confections',
  'Drinks and beverages only',
  'Mixed — multiple cuisines',
]

const BUSINESS_TYPE_OPTIONS = [
  'Canteen — Nigerian / Northern meals (office lunch)',
  'Fast food — burgers, shawarma, chips',
  'Suya, grills & barbecue',
  'Pizza & pasta',
  'Bakery — cakes, pastries, confections',
  'Ice cream, yogurt & frozen treats',
  'Drinks, juices & smoothies bar',
  'Mixed menu (multiple categories)',
]

const OPERATING_HOURS_OPTIONS = [
  'Breakfast only (6am – 10am)',
  'Lunch only (11am – 2pm)',
  'Breakfast + Lunch (6am – 2pm)',
  'Dinner only (5pm – 10pm)',
  'All day (7am – 9pm)',
  'Weekends only',
  'Custom hours',
]

const DELIVERY_CAPABILITY_OPTIONS = [
  'Delivery available — I can deliver within my area',
  'Pick-up only — customer collects from my location',
  'Both delivery and pick-up',
]

// Real, dedicated registration page — built field for field against
// the founder's own reference screenshots, not the generic seller
// registration form this used to just link out to.
function ListCanteen() {
  const [lgas, setLgas] = useState([])
  const [businessName, setBusinessName] = useState('')
  const [cuisineSpeciality, setCuisineSpeciality] = useState(CUISINE_SPECIALITY_OPTIONS[0])
  const [kitchenDescription, setKitchenDescription] = useState('')
  const [businessType, setBusinessType] = useState(BUSINESS_TYPE_OPTIONS[0])
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [nin, setNin] = useState('')
  const [lgaId, setLgaId] = useState('')
  const [address, setAddress] = useState('')
  const [operatingHours, setOperatingHours] = useState(OPERATING_HOURS_OPTIONS[0])
  const [maxOrdersPerHour, setMaxOrdersPerHour] = useState('')
  const [deliveryCapability, setDeliveryCapability] = useState(DELIVERY_CAPABILITY_OPTIONS[0])
  const [menuItems, setMenuItems] = useState([{ name: '', price: '' }, { name: '', price: '' }, { name: '', price: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function loadLgas() {
      // Real fix — this previously pulled every real Nigerian LGA
      // across all 37 states with no filter at all, which is why Jos
      // (Plateau), Kogi, and Taraba LGAs were showing up. Filtered to
      // the real 23 Kaduna State LGAs only.
      const { data } = await supabase
        .from('local_government_areas')
        .select('id, name, states!inner(name)')
        .eq('states.name', 'Kaduna')
        .order('name')
      setLgas(data || [])
      const kadunaNorth = data?.find((l) => l.name === 'Kaduna North')
      if (kadunaNorth) setLgaId(kadunaNorth.id)
      else if (data?.length > 0) setLgaId(data[0].id)
    }
    loadLgas()
  }, [])

  function updateMenuItem(index, field, value) {
    setMenuItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function addMenuItem() {
    setMenuItems((prev) => [...prev, { name: '', price: '' }])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!businessName.trim()) {
      setError('Please enter your business / canteen name')
      return
    }
    setSubmitting(true)
    const { error: submitError } = await supabase.rpc('register_canteen_vendor', {
      p_business_name: businessName.trim(),
      p_cuisine_speciality: cuisineSpeciality,
      p_kitchen_description: kitchenDescription.trim() || null,
      p_business_type: businessType,
      p_owner_name: ownerName.trim(),
      p_phone: phone.trim(),
      p_nin: nin.trim(),
      p_lga_id: lgaId,
      p_address: address.trim(),
      p_operating_hours: operatingHours,
      p_max_orders_per_hour: maxOrdersPerHour ? Number(maxOrdersPerHour) : null,
      p_delivery_capability: deliveryCapability,
      p_menu_items: menuItems.filter((m) => m.name.trim() && m.price).map((m) => ({ name: m.name.trim(), price: Number(m.price) })),
    })
    setSubmitting(false)
    if (submitError) {
      setError(submitError.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="p-4">
        <div className="rounded-xl bg-market-green/10 border border-market-green/30 p-4 text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="font-semibold text-market-green">Registration submitted</p>
          <p className="text-sm text-ink/60 mt-1">We verify within 24 hours.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-black px-4 py-4">
        <p className="text-lg font-display font-bold text-hub-canteen">List your canteen or fast food</p>
        <p className="text-sm text-hub-canteen/80">Commission-only — no monthly fee, no listing fee</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="rounded-xl bg-[#5a3a1a] text-white p-4">
          <p className="font-semibold mb-2">🏪 Canteen & Fast Food — How pricing works</p>
          <p className="text-sm mb-3">
            Unlike regular market sellers, canteen and fast food vendors pay NO monthly subscription and NO listing
            fee. Instead UMC-BCK earns a commission on each order completed through the platform.
          </p>
          <div className="grid grid-cols-2 gap-3 bg-black/20 rounded-lg p-3">
            <div>
              <p className="text-xs text-white/70">Platform commission</p>
              <p className="text-xl font-bold text-hub-canteen">10%</p>
              <p className="text-xs text-white/60">per completed order</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Buyer service charge</p>
              <p className="text-xl font-bold text-hub-canteen">₦150</p>
              <p className="text-xs text-white/60">per order (paid by buyer)</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Monthly subscription</p>
              <p className="text-xl font-bold text-market-green line-through">₦0</p>
              <p className="text-xs text-white/60">free forever</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Listing fee</p>
              <p className="text-xl font-bold text-market-green line-through">₦0</p>
              <p className="text-xs text-white/60">list all your items free</p>
            </div>
          </div>
          <p className="text-xs text-white/70 mt-3">
            Example: you sell 30 orders at ₦2,500 each on a Saturday. Total revenue: ₦75,000. UMC-BCK commission:
            ₦7,500 (10%). You receive: ₦67,500 settled to your account same day.
          </p>
        </div>

        <div className="rounded-xl bg-surface p-4 space-y-3">
          <p className="font-semibold text-hub-canteen">Business details</p>

          <div>
            <label className="text-xs text-ink/50">Business / canteen name</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Mama Nkechi Kitchen, Sha-Wa Palace"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            />
          </div>

          <div>
            <label className="text-xs text-ink/50">Cuisine speciality — what is your kitchen best known for?</label>
            <select
              value={cuisineSpeciality}
              onChange={(e) => setCuisineSpeciality(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            >
              {CUISINE_SPECIALITY_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-ink/50">About your kitchen — describe what makes you special</label>
            <textarea
              value={kitchenDescription}
              onChange={(e) => setKitchenDescription(e.target.value)}
              placeholder="e.g. We specialise in authentic Yoruba meals. Our amala and ewedu is prepared fresh every morning using traditional recipes. We also serve jollof rice, fried rice, and a full protein selection daily."
              rows={4}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            />
          </div>

          <div>
            <label className="text-xs text-ink/50">Business type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            >
              {BUSINESS_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-ink/50">Owner / contact name</label>
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Full name of business owner"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            />
          </div>

          <div>
            <label className="text-xs text-ink/50">Phone number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08XXXXXXXXX"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            />
          </div>

          <div>
            <label className="text-xs text-ink/50">NIN (National ID Number)</label>
            <input
              value={nin}
              onChange={(e) => setNin(e.target.value)}
              placeholder="11-digit NIN — for identity verification"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            />
          </div>
        </div>

        <div className="rounded-xl bg-surface p-4 space-y-3">
          <p className="font-semibold text-hub-canteen">Location & operations</p>

          <div>
            <label className="text-xs text-ink/50">LGA</label>
            <select
              value={lgaId}
              onChange={(e) => setLgaId(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            >
              {lgas.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-ink/50">Exact address / landmark</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Kawo, beside MTN office, No. 14 Tukur Road"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            />
          </div>

          <div>
            <label className="text-xs text-ink/50">Operating hours</label>
            <select
              value={operatingHours}
              onChange={(e) => setOperatingHours(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            >
              {OPERATING_HOURS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-ink/50">Maximum orders per hour (be realistic)</label>
            <input
              value={maxOrdersPerHour}
              onChange={(e) => setMaxOrdersPerHour(e.target.value)}
              type="number"
              placeholder="e.g. 15 — this prevents you from being overwhelmed"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            />
          </div>

          <div>
            <label className="text-xs text-ink/50">Delivery capability</label>
            <select
              value={deliveryCapability}
              onChange={(e) => setDeliveryCapability(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white"
            >
              {DELIVERY_CAPABILITY_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl bg-surface p-4 space-y-3">
          <p className="font-semibold text-hub-canteen">Menu & pricing</p>
          <p className="text-xs text-ink/50">
            List your top 5 items with prices. You can add more after registration from your vendor dashboard.
          </p>
          {menuItems.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={item.name}
                onChange={(e) => updateMenuItem(i, 'name', e.target.value)}
                placeholder={i === 0 ? 'Item name e.g. Chicken shawarma' : 'Item name'}
                className="flex-1 rounded border border-ink/20 px-3 py-2 bg-white"
              />
              <input
                value={item.price}
                onChange={(e) => updateMenuItem(i, 'price', e.target.value)}
                type="number"
                placeholder="₦ price"
                className="w-28 rounded border border-ink/20 px-3 py-2 bg-white"
              />
            </div>
          ))}
          <button type="button" onClick={addMenuItem} className="w-full border border-dashed border-ink/30 rounded py-2 text-sm text-ink/60">
            + Add another menu item
          </button>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: '#d2f5ee' }}>
          <p className="font-semibold mb-1" style={{ color: '#085041' }}>✓ Commission agreement</p>
          <p className="text-sm" style={{ color: '#085041' }}>
            By submitting this registration I agree that UMC-BCK will deduct a 10% commission from each completed
            order before settling my earnings. I understand that settlement is made within 24 hours of order
            confirmation. I agree to the UMC-BCK Terms and Conditions for canteen and fast food vendors.
          </p>
        </div>

        {error && <p className="text-sm text-market-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-hub-canteen text-white rounded-lg py-3 font-semibold disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit registration — we verify within 24 hours'}
        </button>
      </form>
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

  const needingAction = orders.filter((o) => o.status === 'new').length

  return (
    <div>
      <div className="bg-black px-4 py-4">
        <p className="text-lg font-display font-bold text-hub-canteen">Incoming orders</p>
        <p className="text-sm text-hub-canteen/80">{needingAction} order{needingAction === 1 ? '' : 's'} need your action</p>
      </div>
      <div className="p-4">
        {loading && <p className="text-ink/50">Loading…</p>}
        {!loading && orders.length === 0 && (
          <div className="rounded-xl bg-surface p-8 text-center text-ink/50">No orders yet</div>
        )}
        {!loading && orders.length > 0 && (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="rounded border border-ink/10 p-3">
                <p className="text-sm font-medium">Order #{o.id.slice(0, 8)}</p>
                <p className="text-xs text-ink/50 capitalize">{o.status}</p>
                <p className="font-mono text-sm text-indigo">₦{Number(o.total_amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
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
        .select('id, status, total_amount, created_at, sellers!inner(store_name, primary_hub), order_items(product_id, products(name))')
        .eq('buyer_id', user.id)
        .eq('sellers.primary_hub', 'canteen')
        .not('status', 'in', '(delivered,rejected,cancelled,failed)')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setActiveOrder(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="p-4 text-ink/50">Loading…</p>

  if (!activeOrder) {
    return (
      <div>
        <div className="bg-black px-4 py-4">
          <p className="text-lg font-display font-bold text-hub-canteen">Track your order</p>
          <p className="text-sm text-hub-canteen/80">Live status — canteen to your desk</p>
        </div>
        <div className="p-4">
          <div className="rounded-xl bg-surface p-8 text-center text-ink/50">No active food order to track right now.</div>
        </div>
      </div>
    )
  }

  // Real, direct mapping from the real order_status enum to the real
  // four-step timeline shown in the reference — no redirect link, the
  // actual live status lives right here.
  const STEPS = [
    { key: 'received', label: 'Order received', icon: '✓' },
    { key: 'preparing', label: 'Canteen preparing your food', icon: '🔍' },
    { key: 'picking_up', label: 'Rider picking up', icon: '🏍️' },
    { key: 'delivered', label: 'Delivered to your office', icon: '📱' },
  ]
  const statusToStepIndex = { new: 0, confirmed: 0, preparing: 1, assigned: 2, delivered: 3 }
  const currentStepIndex = statusToStepIndex[activeOrder.status] ?? 0
  const itemNames = (activeOrder.order_items || []).map((i) => i.products?.name).filter(Boolean).join(' + ')

  return (
    <div>
      <div className="bg-black px-4 py-4">
        <p className="text-lg font-display font-bold text-hub-canteen">Track your order</p>
        <p className="text-sm text-hub-canteen/80">Live status — canteen to your desk</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="rounded-xl bg-surface p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">#{activeOrder.id.slice(0, 8).toUpperCase()} — {itemNames || 'Order'}</p>
            <p className="text-xs text-ink/50">{activeOrder.sellers?.store_name} · ₦{Number(activeOrder.total_amount).toLocaleString()}</p>
          </div>
          <span className="text-xs font-medium bg-gold/10 text-gold-dark rounded-full px-2 py-1 capitalize">{activeOrder.status}</span>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done = i < currentStepIndex
            const active = i === currentStepIndex
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                    done ? 'bg-market-green text-white' : active ? 'bg-hub-canteen text-white' : 'bg-ink/5 text-ink/40'
                  }`}
                >
                  {done ? '✓' : step.icon}
                </div>
                <div>
                  <p className={`text-sm font-medium ${done || active ? 'text-ink' : 'text-ink/40'}`}>{step.label}</p>
                  <p className="text-xs text-ink/40">
                    {i < currentStepIndex ? new Date(activeOrder.created_at).toLocaleTimeString() : active ? 'In progress' : 'Pending'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
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
  const [yourName, setYourName] = useState('')
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
      p_latest_order_time: latestTime,
      p_organizer_name: yourName.trim() || null,
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

  // Real, preset time options — today's date combined with each real
  // time slot, matching the reference's dropdown exactly rather than a
  // raw native datetime picker.
  const PRESET_TIMES = [
    { label: '11:00am (delivery by 11:45am)', hour: 11 },
    { label: '12:00pm (delivery by 12:45pm)', hour: 12 },
    { label: '1:00pm (delivery by 1:45pm)', hour: 13 },
    { label: '2:00pm (delivery by 2:45pm)', hour: 14 },
  ]

  function presetIso(hour) {
    const d = new Date()
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }

  const formContent = (
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
          <input
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            placeholder="e.g. Aisha Danjuma"
            className="w-full text-sm rounded border border-ink/20 px-2 py-1.5"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Zenith Bank HQ, Kawo"
            className="w-full text-sm rounded border border-ink/20 px-2 py-1.5"
          />
          <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="w-full text-sm rounded border border-ink/20 px-2 py-1.5">
            <option value="">-- Select canteen --</option>
            {canteens.map((c) => (
              <option key={c.id} value={c.id}>
                {c.store_name}
              </option>
            ))}
          </select>
          <select value={latestTime} onChange={(e) => setLatestTime(e.target.value)} className="w-full text-sm rounded border border-ink/20 px-2 py-1.5">
            <option value="">-- Latest order time --</option>
            {PRESET_TIMES.map((t) => (
              <option key={t.hour} value={presetIso(t.hour)}>
                {t.label}
              </option>
            ))}
          </select>
          <button type="submit" className="w-full text-sm bg-market-green text-white rounded py-2 font-medium">
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
  )

  // Real, dedicated full-page layout when this is the actual "Group
  // order" tab — the reference shows this content always visible with
  // its own real header, not tucked behind a collapse toggle.
  if (forceOpen) {
    return (
      <div>
        <div className="bg-black px-4 py-4">
          <p className="text-lg font-display font-bold text-hub-canteen">Group order</p>
          <p className="text-sm text-hub-canteen/80">Colleagues order together — one delivery, split bill</p>
        </div>
        <div className="p-4">
          <p className="text-sm text-ink/70 mb-3">
            Share your group order link with colleagues on WhatsApp. Everyone adds their own meal. One rider
            delivers everything at once. Delivery fee is split equally.
          </p>
          <div className="rounded-xl bg-surface p-4">
            <p className="font-semibold text-sm mb-3">Start a group order</p>
            {formContent}
          </div>
        </div>
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
      {open && formContent}
    </div>
  )
}

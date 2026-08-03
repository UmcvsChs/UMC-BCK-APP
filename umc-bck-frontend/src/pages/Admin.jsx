import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const [tab, setTab] = useState('analytics')

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Admin Control Room</h1>
      <p className="text-sm text-ink/50 mb-6">
        Nothing goes live without passing through here — every registration and listing waits for review.
      </p>

      <div className="flex gap-1 border-b border-ink/10 mb-4 overflow-x-auto">
        {['analytics', 'registrations', 'listings', 'prescriptions', 'bills', 'ledger', 'disputes', 'promocodes', 'accesslog', 'deliveryfees', 'dispatch', 'fraud'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {t === 'analytics'
              ? 'Analytics'
              : t === 'prescriptions'
                ? 'Prescription requests'
                : t === 'bills'
                  ? 'Bill payments'
                  : t === 'ledger'
                    ? 'Bills ledger'
                    : t === 'promocodes'
                      ? 'Promo codes'
                      : t === 'accesslog'
                        ? 'Access log'
                        : t === 'deliveryfees'
                          ? 'Delivery fees'
                          : t === 'dispatch'
                            ? 'Order dispatch'
                            : t === 'fraud'
                              ? 'Fraud alert'
                              : `Pending ${t}`}
          </button>
        ))}
      </div>

      {tab === 'analytics' && <PlatformAnalytics />}
      {tab === 'registrations' && <PendingRegistrations />}
      {tab === 'listings' && <PendingListings />}
      {tab === 'prescriptions' && <PendingPrescriptions />}
      {tab === 'bills' && <PendingBills />}
      {tab === 'ledger' && <BillsLedger />}
      {tab === 'disputes' && <OpenDisputes />}
      {tab === 'promocodes' && <PromoCodes />}
      {tab === 'accesslog' && <AccessLog />}
      {tab === 'deliveryfees' && <DeliveryFees />}
      {tab === 'dispatch' && <OrderDispatch />}
      {tab === 'fraud' && <FraudAlert />}
    </div>
  )
}

function PendingPrescriptions() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)
  const [signedUrls, setSignedUrls] = useState({})

  async function load() {
    const { data, error } = await supabase
      .from('prescription_requests')
      .select('id, medication_name, dosage, requested_quantity, notes, prescription_image_url, status')
      .eq('status', 'pending')
    if (!error) setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function viewPrescription(row) {
    // Private bucket — a signed URL is required, there is no public link.
    const { data } = await supabase.storage
      .from('prescriptions')
      .createSignedUrl(row.prescription_image_url, 300)
    if (data) setSignedUrls((prev) => ({ ...prev, [row.id]: data.signedUrl }))
  }

  async function handleDecision(requestId, approve) {
    setActioning(requestId)
    await supabase.rpc('review_prescription_request', {
      p_request_id: requestId,
      p_decision: approve ? 'approved' : 'declined',
    })
    setActioning(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (rows.length === 0) return <p className="text-ink/50">No pending prescription requests.</p>

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <p className="text-sm font-medium">{r.medication_name}</p>
          <p className="text-xs text-ink/50">
            Qty {r.requested_quantity}
            {r.dosage && ` · ${r.dosage}`}
          </p>
          {r.notes && <p className="text-xs text-ink/60 mt-1">{r.notes}</p>}

          {signedUrls[r.id] ? (
            <a
              href={signedUrls[r.id]}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo underline mt-1 inline-block"
            >
              View prescription photo
            </a>
          ) : (
            <button onClick={() => viewPrescription(r)} className="text-xs text-indigo underline mt-1">
              Load prescription photo
            </button>
          )}

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleDecision(r.id, true)}
              disabled={actioning === r.id}
              className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() => handleDecision(r.id, false)}
              disabled={actioning === r.id}
              className="text-xs bg-market-red text-white rounded px-3 py-1.5 disabled:opacity-60"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PendingRegistrations() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)

  async function load() {
    // admin_pending_registrations unifies sellers/delivery_agents/repairers/
    // pharma_reseller_verifications into one queue — built for exactly this.
    const { data, error } = await supabase.from('admin_pending_registrations').select('*')
    if (!error) setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDecision(row, approve) {
    setActioning(row.id)
    const fn = approve ? 'admin_approve_registration' : 'admin_reject_registration'
    await supabase.rpc(fn, { p_registration_type: row.registration_type, p_id: row.id })
    setActioning(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (rows.length === 0) return <p className="text-ink/50">No pending registrations.</p>

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={`${r.registration_type}-${r.id}`} className="rounded border border-ink/10 bg-white px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{r.display_name || r.registration_type}</p>
              <p className="text-xs text-ink/50 capitalize">{r.registration_type.replace('_', ' ')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDecision(r, true)}
                disabled={actioning === r.id}
                className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(r, false)}
                disabled={actioning === r.id}
                className="text-xs bg-market-red text-white rounded px-3 py-1.5 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PendingListings() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)

  async function load() {
    const { data, error } = await supabase.from('admin_pending_listings').select('*')
    if (!error) setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDecision(productId, approve) {
    setActioning(productId)
    const fn = approve ? 'admin_approve_listing' : 'admin_reject_listing'
    await supabase.rpc(fn, { p_product_id: productId })
    setActioning(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (rows.length === 0) return <p className="text-ink/50">No pending listings.</p>

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-ink/50">
                {r.store_name} · {r.category}
                {r.price != null && ` · ₦${Number(r.price).toLocaleString()}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDecision(r.id, true)}
                disabled={actioning === r.id}
                className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(r.id, false)}
                disabled={actioning === r.id}
                className="text-xs bg-market-red text-white rounded px-3 py-1.5 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PlatformAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      // get_platform_analytics() is a table-returning function — PostgREST
      // always returns it as an array, even though it's conceptually one row.
      const { data, error } = await supabase.rpc('get_platform_analytics')
      if (error) setError(error.message)
      else setData(data?.[0] || null)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (error) return <p className="text-sm text-market-red">{error}</p>
  if (!data) return <p className="text-ink/50">No data.</p>

  const usersByRole = data.users_by_role || {}
  const ordersByStatus = data.orders_by_status || {}

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total users" value={data.total_users} />
        <StatCard label="Total orders" value={data.total_orders} />
        <StatCard label="Stores (open)" value={`${data.total_sellers} (${data.sellers_open})`} />
        <StatCard label="Open disputes" value={data.open_disputes_count} accent={data.open_disputes_count > 0 ? 'text-market-red' : ''} />
        <StatCard label="Delivered GMV" value={`₦${Number(data.total_gmv).toLocaleString()}`} mono />
        <StatCard label="Total wallet balance" value={`₦${Number(data.total_wallet_balance).toLocaleString()}`} mono />
        <StatCard label="Pending registrations" value={data.pending_registrations_count} accent={data.pending_registrations_count > 0 ? 'text-gold-dark' : ''} />
        <StatCard label="Pending listings" value={data.pending_listings_count} accent={data.pending_listings_count > 0 ? 'text-gold-dark' : ''} />
      </div>

      <div>
        <p className="text-xs font-medium text-ink/60 mb-2">Users by role</p>
        <div className="space-y-1">
          {Object.entries(usersByRole).map(([role, count]) => (
            <div key={role} className="flex justify-between text-sm">
              <span className="capitalize text-ink/70">{role.replace(/_/g, ' ')}</span>
              <span className="font-mono">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-ink/60 mb-2">Orders by status</p>
        <div className="space-y-1">
          {Object.entries(ordersByStatus).map(([status, count]) => (
            <div key={status} className="flex justify-between text-sm">
              <span className="capitalize text-ink/70">{status.replace(/_/g, ' ')}</span>
              <span className="font-mono">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent = '', mono = false }) {
  return (
    <div className="rounded border border-ink/10 bg-white px-3 py-2">
      <p className="text-xs text-ink/50">{label}</p>
      <p className={`text-lg font-display font-semibold ${mono ? 'font-mono text-base' : ''} ${accent || 'text-indigo'}`}>
        {value}
      </p>
    </div>
  )
}

function PendingBills() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [refs, setRefs] = useState({})

  async function load() {
    const { data } = await supabase
      .from('bill_payments')
      .select('id, category, provider, account_reference, amount, status')
      .eq('status', 'processing')
      .order('created_at', { ascending: true })
    setBills(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function complete(billId) {
    setActing(billId)
    await supabase.rpc('complete_bill_payment', {
      p_bill_payment_id: billId,
      p_provider_reference: refs[billId] || 'manual',
    })
    setActing(null)
    load()
  }

  async function fail(billId) {
    setActing(billId)
    await supabase.rpc('fail_bill_payment', {
      p_bill_payment_id: billId,
      p_reason: 'Could not be fulfilled — refunded to wallet',
    })
    setActing(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (bills.length === 0) return <p className="text-ink/50">No bill payments waiting on manual processing.</p>

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/50 mb-2">
        These are being fulfilled manually while a direct provider connection is set up — completing here confirms it actually happened outside the platform.
      </p>
      {bills.map((b) => (
        <div key={b.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <p className="text-sm font-medium">{b.category} · {b.provider}</p>
          <p className="text-xs text-ink/50">{b.account_reference}</p>
          <p className="font-mono text-sm text-indigo mt-1">₦{Number(b.amount).toLocaleString()}</p>
          <input
            placeholder="Reference (optional)"
            value={refs[b.id] || ''}
            onChange={(e) => setRefs((prev) => ({ ...prev, [b.id]: e.target.value }))}
            className="w-full text-xs rounded border border-ink/20 px-2 py-1 mt-2"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => complete(b.id)}
              disabled={acting === b.id}
              className="flex-1 text-xs bg-market-green text-white rounded py-1.5 disabled:opacity-60"
            >
              Mark fulfilled
            </button>
            <button
              onClick={() => fail(b.id)}
              disabled={acting === b.id}
              className="flex-1 text-xs bg-market-red text-white rounded py-1.5 disabled:opacity-60"
            >
              Failed — refund
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function OpenDisputes() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [notes, setNotes] = useState({})

  async function load() {
    const { data } = await supabase
      .from('disputes')
      .select('id, reason, description, status, order_id')
      .in('status', ['open', 'investigating'])
      .order('created_at', { ascending: true })
    setDisputes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function resolve(disputeId, status) {
    setActing(disputeId)
    await supabase.rpc('resolve_dispute', {
      p_dispute_id: disputeId,
      p_status: status,
      p_resolution_notes: notes[disputeId] || '',
    })
    setActing(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (disputes.length === 0) return <p className="text-ink/50">No open disputes.</p>

  return (
    <div className="space-y-2">
      {disputes.map((d) => (
        <div key={d.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <p className="text-sm font-medium">{d.reason}</p>
          <p className="text-xs text-ink/60 mt-1">{d.description}</p>
          <p className="font-mono text-xs text-ink/40 mt-1">Order {d.order_id.slice(0, 8)}</p>

          <textarea
            placeholder="Resolution notes"
            value={notes[d.id] || ''}
            onChange={(e) => setNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
            rows={2}
            className="w-full text-xs rounded border border-ink/20 px-2 py-1 mt-2"
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => resolve(d.id, 'resolved_buyer')}
              disabled={acting === d.id}
              className="text-xs bg-market-green text-white rounded py-1.5 disabled:opacity-60"
            >
              Favor buyer
            </button>
            <button
              onClick={() => resolve(d.id, 'resolved_seller')}
              disabled={acting === d.id}
              className="text-xs bg-indigo text-white rounded py-1.5 disabled:opacity-60"
            >
              Favor seller
            </button>
            <button
              onClick={() => resolve(d.id, 'resolved_split')}
              disabled={acting === d.id}
              className="text-xs bg-gold text-ink rounded py-1.5 disabled:opacity-60"
            >
              Split
            </button>
            <button
              onClick={() => resolve(d.id, 'dismissed')}
              disabled={acting === d.id}
              className="text-xs bg-market-red text-white rounded py-1.5 disabled:opacity-60"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PromoCodes() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState('fixed_amount')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('promo_codes')
      .select('id, code, discount_type, discount_value, max_uses, uses_count, is_active')
      .order('created_at', { ascending: false })
    setCodes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function createCode(e) {
    e.preventDefault()
    setError(null)
    setCreating(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('promo_codes').insert({
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      max_uses: maxUses ? Number(maxUses) : null,
      created_by: user.id,
    })

    setCreating(false)
    if (error) {
      setError(error.message)
      return
    }
    setCode('')
    setDiscountValue('')
    setMaxUses('')
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>

  return (
    <div>
      <form onSubmit={createCode} className="space-y-2 mb-4 rounded border border-ink/10 bg-white p-3">
        <div className="flex gap-2">
          <input
            required
            placeholder="CODE"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 text-sm rounded border border-ink/20 px-2 py-1 font-mono uppercase"
          />
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            className="text-sm rounded border border-ink/20 px-2 py-1"
          >
            <option value="fixed_amount">₦ fixed</option>
            <option value="percentage">% off</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input
            required
            type="number"
            placeholder={discountType === 'fixed_amount' ? 'Amount ₦' : 'Percent'}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="flex-1 text-sm rounded border border-ink/20 px-2 py-1 font-mono"
          />
          <input
            type="number"
            placeholder="Max uses (optional)"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="flex-1 text-sm rounded border border-ink/20 px-2 py-1 font-mono"
          />
        </div>
        {error && <p className="text-xs text-market-red">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="w-full text-sm bg-indigo text-white rounded py-2 disabled:opacity-60"
        >
          {creating ? 'Creating…' : 'Create promo code'}
        </button>
      </form>

      <div className="space-y-2">
        {codes.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded border border-ink/10 bg-white px-3 py-2">
            <div>
              <p className="font-mono text-sm font-medium">{c.code}</p>
              <p className="text-xs text-ink/50">
                {c.discount_type === 'fixed_amount' ? `₦${Number(c.discount_value).toLocaleString()}` : `${c.discount_value}%`}
                {c.max_uses && ` · ${c.uses_count}/${c.max_uses} used`}
              </p>
            </div>
            <span className={`text-xs font-medium ${c.is_active ? 'text-market-green' : 'text-ink/40'}`}>
              {c.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccessLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('admin_actions_log')
        .select('id, action, target_type, notes, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (logs.length === 0) return <p className="text-ink/50">No admin actions logged yet.</p>

  return (
    <div className="space-y-1">
      {logs.map((l) => (
        <div key={l.id} className="text-xs rounded border border-ink/10 bg-white px-3 py-2">
          <p className="font-medium capitalize">{l.action.replace(/_/g, ' ')} — {l.target_type}</p>
          {l.notes && <p className="text-ink/50">{l.notes}</p>}
          <p className="text-ink/40 font-mono">{new Date(l.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}

function DeliveryFees() {
  const [lgas, setLgas] = useState([])
  const [fees, setFees] = useState({})
  const [lgaId, setLgaId] = useState('')
  const [fee, setFee] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: l }, { data: f }] = await Promise.all([
      supabase.from('local_government_areas').select('id, name, states!inner(is_launched)').eq('states.is_launched', true).order('name'),
      supabase.from('delivery_fee_zones').select('lga_id, base_fee'),
    ])
    setLgas(l || [])
    const feeMap = {}
    ;(f || []).forEach((row) => {
      feeMap[row.lga_id] = row.base_fee
    })
    setFees(feeMap)
  }

  useEffect(() => {
    load()
  }, [])

  async function saveFee(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('delivery_fee_zones').upsert({ lga_id: lgaId, base_fee: Number(fee) }, { onConflict: 'lga_id' })
    setSaving(false)
    setLgaId('')
    setFee('')
    load()
  }

  return (
    <div>
      <p className="text-xs text-ink/50 mb-3">
        Real fees, per LGA — nothing here is estimated or invented. Unset LGAs show buyers an honest "not yet set" at checkout rather than a fake ₦0.
      </p>
      <form onSubmit={saveFee} className="flex gap-2 mb-4">
        <select
          required
          value={lgaId}
          onChange={(e) => setLgaId(e.target.value)}
          className="flex-1 text-sm rounded border border-ink/20 px-2 py-1.5"
        >
          <option value="">Select LGA</option>
          {lgas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} {fees[l.id] != null ? `(₦${Number(fees[l.id]).toLocaleString()})` : ''}
            </option>
          ))}
        </select>
        <input
          required
          type="number"
          placeholder="₦ fee"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="w-28 text-sm rounded border border-ink/20 px-2 py-1.5 font-mono"
        />
        <button type="submit" disabled={saving} className="text-sm bg-indigo text-white rounded px-3 disabled:opacity-60">
          Save
        </button>
      </form>

      <div className="space-y-1">
        {lgas.filter((l) => fees[l.id] != null).map((l) => (
          <div key={l.id} className="flex justify-between text-xs">
            <span>{l.name}</span>
            <span className="font-mono">₦{Number(fees[l.id]).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrderDispatch() {
  const [assignments, setAssignments] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [reassigning, setReassigning] = useState(null)
  const [newAgentId, setNewAgentId] = useState({})

  async function load() {
    const [{ data: a }, { data: ag }] = await Promise.all([
      supabase
        .from('delivery_assignments')
        .select('id, status, assigned_at, sla_deadline, orders(id, delivery_address), delivery_agents(id, user_id)')
        .in('status', ['assigned', 'escalated'])
        .order('assigned_at', { ascending: true }),
      supabase.from('delivery_agents_with_rate').select('id, lga_id, acceptance_rate').eq('is_online', true).eq('verification_status', 'approved'),
    ])
    setAssignments(a || [])
    setAgents(ag || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function reassign(orderId) {
    setReassigning(orderId)
    await supabase.rpc('admin_reassign_order', { p_order_id: orderId, p_new_agent_id: newAgentId[orderId] })
    setReassigning(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (assignments.length === 0) return <p className="text-ink/50">No active or escalated deliveries.</p>

  return (
    <div className="space-y-2">
      {assignments.map((a) => (
        <div key={a.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <p className="text-sm font-medium">{a.orders?.delivery_address || 'No address'}</p>
          <p className="text-xs text-ink/50">
            Assigned {new Date(a.assigned_at).toLocaleTimeString()} · SLA {new Date(a.sla_deadline).toLocaleTimeString()}
          </p>
          <span className={`text-xs font-medium capitalize ${a.status === 'escalated' ? 'text-market-red' : 'text-market-green'}`}>
            {a.status}
          </span>

          <div className="flex gap-2 mt-2">
            <select
              value={newAgentId[a.orders.id] || ''}
              onChange={(e) => setNewAgentId((prev) => ({ ...prev, [a.orders.id]: e.target.value }))}
              className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
            >
              <option value="">Reassign to…</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  Agent {ag.id.slice(0, 8)} — {ag.acceptance_rate != null ? `${ag.acceptance_rate}%` : 'new'}
                </option>
              ))}
            </select>
            <button
              onClick={() => reassign(a.orders.id)}
              disabled={reassigning === a.orders.id || !newAgentId[a.orders.id]}
              className="text-xs bg-indigo text-white rounded px-3 disabled:opacity-60"
            >
              Reassign
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function FraudAlert() {
  const [sellerFlags, setSellerFlags] = useState([])
  const [buyerFlags, setBuyerFlags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Real, computable signals only — no invented "risk score." A seller
      // with multiple disputes against their orders, or a buyer who raises
      // disputes unusually often, are the two honest flags this data
      // actually supports.
      const { data: disputes } = await supabase
        .from('disputes')
        .select('raised_by, orders(seller_id, sellers(store_name))')

      const sellerCounts = {}
      const buyerCounts = {}
      ;(disputes || []).forEach((d) => {
        const sellerId = d.orders?.seller_id
        const storeName = d.orders?.sellers?.store_name
        if (sellerId) {
          sellerCounts[sellerId] = sellerCounts[sellerId] || { count: 0, storeName }
          sellerCounts[sellerId].count += 1
        }
        if (d.raised_by) {
          buyerCounts[d.raised_by] = (buyerCounts[d.raised_by] || 0) + 1
        }
      })

      setSellerFlags(
        Object.entries(sellerCounts)
          .filter(([, v]) => v.count >= 2)
          .map(([id, v]) => ({ id, ...v }))
      )
      setBuyerFlags(
        Object.entries(buyerCounts)
          .filter(([, count]) => count >= 2)
          .map(([id, count]) => ({ id, count }))
      )
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-ink/50">Loading…</p>

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink/50">
        Real, computable signals only — sellers with 2+ disputes against their orders, or buyers who've raised 2+
        disputes. This isn't a fraud verdict, just visibility worth a human look.
      </p>

      <div>
        <p className="text-xs font-medium text-ink/60 mb-2">Sellers flagged</p>
        {sellerFlags.length === 0 && <p className="text-xs text-ink/40">None currently.</p>}
        {sellerFlags.map((f) => (
          <div key={f.id} className="flex justify-between text-sm rounded border border-ink/10 bg-white px-3 py-2 mb-1">
            <span>{f.storeName}</span>
            <span className="text-market-red font-medium">{f.count} disputes</span>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium text-ink/60 mb-2">Buyers flagged</p>
        {buyerFlags.length === 0 && <p className="text-xs text-ink/40">None currently.</p>}
        {buyerFlags.map((f) => (
          <div key={f.id} className="flex justify-between text-sm rounded border border-ink/10 bg-white px-3 py-2 mb-1">
            <span className="font-mono text-xs">{f.id.slice(0, 8)}</span>
            <span className="text-market-red font-medium">{f.count} disputes raised</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BillsLedger() {
  const [bills, setBills] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    let query = supabase
      .from('bill_payments')
      .select('id, category, provider, amount, status, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter)

    const { data } = await query
    setBills(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [categoryFilter])

  const categories = ['all', 'airtime', 'data', 'electricity', 'dstv', 'gotv', 'showmax', 'internet', 'betting', 'waec', 'neco']
  const totalsByStatus = bills.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + Number(b.amount)
    return acc
  }, {})

  if (loading) return <p className="text-ink/50">Loading…</p>

  return (
    <div>
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="w-full text-sm rounded border border-ink/20 px-3 py-2 mb-3"
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c === 'all' ? 'All categories' : c}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {Object.entries(totalsByStatus).map(([status, total]) => (
          <div key={status} className="rounded border border-ink/10 bg-white px-3 py-2">
            <p className="text-xs text-ink/50 capitalize">{status}</p>
            <p className="font-mono text-sm">₦{total.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {bills.map((b) => (
          <div key={b.id} className="flex justify-between text-xs rounded border border-ink/10 bg-white px-3 py-2">
            <span className="capitalize">{b.category} · {b.provider}</span>
            <div className="text-right">
              <p className="font-mono">₦{Number(b.amount).toLocaleString()}</p>
              <p className="capitalize text-ink/40">{b.status}</p>
            </div>
          </div>
        ))}
        {bills.length === 0 && <p className="text-ink/50 text-sm">No bill payments in this category yet.</p>}
      </div>
    </div>
  )
}

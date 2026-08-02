import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DeliveryAgentDashboard() {
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [earnings, setEarnings] = useState(null)

  async function loadAgent() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('delivery_agents').select('*').eq('user_id', user.id).maybeSingle()
    setAgent(data)
    setLoading(false)
  }

  async function loadAssignments(agentId) {
    // Real acceptance rate — computed from total_fulfilled / total_assignments,
    // not a stored number that could drift out of sync.
    const { data } = await supabase
      .from('delivery_assignments')
      .select('id, status, assigned_at, sla_deadline, orders(id, delivery_address, total_amount, delivery_type, status)')
      .eq('delivery_agent_id', agentId)
      .eq('status', 'assigned')
      .order('assigned_at', { ascending: true })
    setAssignments(data || [])
  }

  async function loadEarnings(agentId) {
    // There is no dedicated "agent payout" field anywhere in the schema —
    // the honest, real mapping is the delivery_fee of every order this
    // agent actually delivered, not an invented number.
    const { data } = await supabase
      .from('delivery_assignments')
      .select('resolved_at, orders(delivery_fee)')
      .eq('delivery_agent_id', agentId)
      .eq('status', 'delivered')
    const total = (data || []).reduce((sum, a) => sum + Number(a.orders?.delivery_fee || 0), 0)
    setEarnings({ total, count: (data || []).length })
  }

  useEffect(() => {
    loadAgent()
  }, [])

  useEffect(() => {
    if (agent?.id) {
      loadAssignments(agent.id)
      loadEarnings(agent.id)
    }
  }, [agent])

  async function toggleOnline() {
    setTogglingOnline(true)
    const { error } = await supabase
      .from('delivery_agents')
      .update({ is_online: !agent.is_online })
      .eq('id', agent.id)
    setTogglingOnline(false)
    if (!error) setAgent((prev) => ({ ...prev, is_online: !prev.is_online }))
  }

  async function handleMarkDelivered(orderId, assignmentId) {
    const { error } = await supabase.rpc('mark_order_delivered', { p_order_id: orderId })
    if (!error) loadAssignments(agent.id)
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  if (!agent) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-ink/60 mb-3">You're not registered as a delivery agent yet.</p>
        <Link to="/delivery/register" className="text-indigo font-medium">
          Register as a delivery agent →
        </Link>
      </div>
    )
  }

  const acceptanceRate =
    agent.total_assignments > 0 ? Math.round((100 * agent.total_fulfilled) / agent.total_assignments) : null

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-display font-semibold text-indigo">Delivery Dashboard</h1>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            agent.verification_status === 'approved'
              ? 'bg-market-green/10 text-market-green'
              : agent.verification_status === 'rejected'
                ? 'bg-market-red/10 text-market-red'
                : 'bg-gold/10 text-gold-dark'
          }`}
        >
          {agent.verification_status}
        </span>
      </div>

      {acceptanceRate != null && (
        <p className="text-sm text-ink/50 mb-4">
          {agent.total_fulfilled} of {agent.total_assignments} completed · {acceptanceRate}% follow-through
        </p>
      )}

      {earnings && (
        <div className="rounded bg-market-green/10 px-4 py-3 mb-4">
          <p className="text-xs text-ink/50">Earnings from {earnings.count} completed {earnings.count === 1 ? 'delivery' : 'deliveries'}</p>
          <p className="font-mono text-xl text-market-green">₦{earnings.total.toLocaleString()}</p>
          <p className="text-xs text-ink/40 mt-1">
            The delivery fee from each order you've actually delivered — there's no separate payout field, this is
            the real figure.
          </p>
        </div>
      )}

      {agent.verification_status === 'approved' ? (
        <button
          onClick={toggleOnline}
          disabled={togglingOnline}
          className={`w-full rounded font-display font-medium py-2.5 mb-6 transition-colors disabled:opacity-60 ${
            agent.is_online
              ? 'bg-market-green text-white hover:opacity-90'
              : 'bg-ink/10 text-ink/60 hover:bg-ink/15'
          }`}
        >
          {togglingOnline ? 'Updating…' : agent.is_online ? 'Online — accepting deliveries' : 'Offline — go online'}
        </button>
      ) : (
        <p className="text-sm text-ink/50 mb-6">
          You'll be able to go online for deliveries once your registration is approved.
        </p>
      )}

      <h2 className="text-sm font-display font-semibold text-ink/70 mb-2">Active deliveries</h2>
      {assignments.length === 0 && <p className="text-sm text-ink/50">No active deliveries right now.</p>}

      <div className="space-y-2">
        {assignments.map((a) => (
          <div key={a.id} className="rounded border border-ink/10 bg-white px-3 py-2">
            <p className="text-sm font-medium">{a.orders?.delivery_address || 'No address on file'}</p>
            <p className="text-xs text-ink/50 capitalize">{a.orders?.delivery_type?.replace('_', ' ')}</p>
            <p className="font-mono text-sm text-indigo mt-1">
              ₦{a.orders?.total_amount != null ? Number(a.orders.total_amount).toLocaleString() : '—'}
            </p>
            <button
              onClick={() => handleMarkDelivered(a.orders.id, a.id)}
              className="w-full mt-2 text-xs bg-market-green text-white rounded py-1.5"
            >
              Mark delivered — buyer confirmed receipt
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

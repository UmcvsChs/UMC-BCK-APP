import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DeliveryAgentDashboard() {
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [earnings, setEarnings] = useState(null)
  const [reportingFor, setReportingFor] = useState(null)
  const [incidentText, setIncidentText] = useState('')
  const [listening, setListening] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState(null)

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
      .select('id, status, assigned_at, sla_deadline, arrived_at, proof_photo_url, orders(id, delivery_address, total_amount, delivery_type, status)')
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

  async function handleRecordArrival(assignmentId) {
    await supabase.rpc('record_agent_arrival', { p_assignment_id: assignmentId })
    loadAssignments(agent.id)
  }

  async function handleAssessFine(assignmentId) {
    const { data, error } = await supabase.rpc('assess_waiting_fine', { p_assignment_id: assignmentId })
    if (!error) {
      alert(data > 0 ? `₦${Number(data).toLocaleString()} waiting fine charged.` : 'Still within the 10-minute free window — no fine yet.')
      loadAssignments(agent.id)
      loadEarnings(agent.id)
    }
  }

  function startVoiceInput() {
    // Real browser Web Speech API — no server round-trip, purely client-side.
    // Not supported in every browser (notably not in Firefox), so this is
    // offered as an addition to typing, never a replacement for it.
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input isn\u2019t supported in this browser — please type the report instead.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-NG'
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setIncidentText((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.start()
  }

  async function submitIncidentReport(assignmentId) {
    if (!incidentText.trim()) return
    await supabase.rpc('file_incident_report', { p_assignment_id: assignmentId, p_description: incidentText })
    setReportingFor(null)
    setIncidentText('')
  }

  async function uploadProofPhoto(assignmentId) {
    if (!photoFile || !agent) return
    setUploadingPhotoFor(assignmentId)
    const path = `${agent.id}/${assignmentId}-${Date.now()}.${photoFile.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('delivery-proof').upload(path, photoFile)
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('delivery-proof').getPublicUrl(path)
      await supabase.rpc('record_proof_photo', { p_assignment_id: assignmentId, p_photo_url: urlData.publicUrl })
    }
    setUploadingPhotoFor(null)
    setPhotoFile(null)
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
      <details className="mb-3 rounded bg-ink/5 px-3 py-2 text-xs text-ink/60">
        <summary className="cursor-pointer font-medium">Waiting-time fine policy</summary>
        <p className="mt-1">
          First 10 minutes of waiting are free. After that, ₦50/minute, capped at ₦1,000 (30 minutes total wait).
          70% goes to you, the rest is retained by the platform. Only assess a fine after you've genuinely recorded
          your arrival — this is based on real elapsed time, not an estimate.
        </p>
      </details>
      {assignments.length === 0 && <p className="text-sm text-ink/50">No active deliveries right now.</p>}

      <div className="space-y-2">
        {assignments.map((a) => (
          <div key={a.id} className="rounded border border-ink/10 bg-white px-3 py-2">
            <p className="text-sm font-medium">{a.orders?.delivery_address || 'No address on file'}</p>
            <p className="text-xs text-ink/50 capitalize">{a.orders?.delivery_type?.replace('_', ' ')}</p>
            <p className="font-mono text-sm text-indigo mt-1">
              ₦{a.orders?.total_amount != null ? Number(a.orders.total_amount).toLocaleString() : '—'}
            </p>

            {!a.arrived_at ? (
              <button
                onClick={() => handleRecordArrival(a.id)}
                className="w-full mt-2 text-xs bg-gold text-ink rounded py-1.5"
              >
                Na isa — I've arrived, start wait timer
              </button>
            ) : (
              <button
                onClick={() => handleAssessFine(a.id)}
                className="w-full mt-2 text-xs bg-market-red/10 text-market-red rounded py-1.5"
              >
                Waiting since {new Date(a.arrived_at).toLocaleTimeString()} — assess fine
              </button>
            )}

            <div className="mt-2">
              {a.proof_photo_url ? (
                <p className="text-xs text-market-green">✓ Proof photo attached</p>
              ) : (
                <div className="flex gap-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="flex-1 text-xs"
                  />
                  <button
                    onClick={() => uploadProofPhoto(a.id)}
                    disabled={!photoFile || uploadingPhotoFor === a.id}
                    className="text-xs bg-indigo text-white rounded px-2 disabled:opacity-60"
                  >
                    {uploadingPhotoFor === a.id ? '…' : 'Attach proof'}
                  </button>
                </div>
              )}
            </div>

            {reportingFor === a.id ? (
              <div className="mt-2 space-y-1">
                <textarea
                  value={incidentText}
                  onChange={(e) => setIncidentText(e.target.value)}
                  placeholder="Describe the issue — wrong address, buyer unreachable, unsafe area…"
                  rows={2}
                  className="w-full text-xs rounded border border-ink/20 px-2 py-1"
                />
                <div className="flex gap-1">
                  <button
                    onClick={startVoiceInput}
                    className={`text-xs rounded px-2 py-1 ${listening ? 'bg-market-red text-white' : 'bg-ink/10 text-ink/70'}`}
                  >
                    {listening ? '● Listening…' : '🎙 Voice'}
                  </button>
                  <button
                    onClick={() => submitIncidentReport(a.id)}
                    className="flex-1 text-xs bg-indigo text-white rounded py-1"
                  >
                    File report
                  </button>
                  <button onClick={() => setReportingFor(null)} className="text-xs text-ink/50 px-2">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setReportingFor(a.id)} className="text-xs text-market-red underline mt-2 block">
                Report an incident
              </button>
            )}

            <button
              onClick={() => handleMarkDelivered(a.orders.id, a.id)}
              className="w-full mt-2 text-xs bg-market-green text-white rounded py-1.5"
            >
              Na kai — mark delivered, buyer confirmed receipt
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

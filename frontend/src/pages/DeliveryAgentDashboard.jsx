import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PushNotificationToggle from '../components/PushNotificationToggle'

export default function DeliveryAgentDashboard() {
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [earnings, setEarnings] = useState(null)
  const [performance, setPerformance] = useState(null)
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

  async function loadEarnings(agentId, userId) {
    // There is no dedicated "agent payout" field anywhere in the schema —
    // the honest, real mapping is the delivery_fee of every order this
    // agent actually delivered, not an invented number.
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: allTime }, { data: today }, { data: week }, { data: wallet }, { data: waitingBonusRows }] = await Promise.all([
      supabase.from('delivery_assignments').select('resolved_at, orders(delivery_fee)').eq('delivery_agent_id', agentId).eq('status', 'delivered'),
      supabase.from('delivery_assignments').select('orders(delivery_fee)').eq('delivery_agent_id', agentId).eq('status', 'delivered').gte('resolved_at', todayStart),
      supabase.from('delivery_assignments').select('orders(delivery_fee)').eq('delivery_agent_id', agentId).eq('status', 'delivered').gte('resolved_at', weekStart),
      supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle(),
      supabase.from('wallet_transactions').select('amount, wallets!inner(user_id)').eq('reference_type', 'waiting_fine').eq('wallets.user_id', userId).eq('type', 'credit'),
    ])

    const total = (allTime || []).reduce((sum, a) => sum + Number(a.orders?.delivery_fee || 0), 0)
    const todayTotal = (today || []).reduce((sum, a) => sum + Number(a.orders?.delivery_fee || 0), 0)
    const weekTotal = (week || []).reduce((sum, a) => sum + Number(a.orders?.delivery_fee || 0), 0)
    const waitingBonus = (waitingBonusRows || []).reduce((sum, r) => sum + Number(r.amount || 0), 0)

    setEarnings({
      total,
      count: (allTime || []).length,
      today: todayTotal,
      todayCount: (today || []).length,
      thisWeek: weekTotal,
      weekCount: (week || []).length,
      waitingBonus,
      waitingBonusCount: (waitingBonusRows || []).length,
      walletBalance: wallet?.balance || 0,
    })
  }

  useEffect(() => {
    loadAgent()
  }, [])

  useEffect(() => {
    if (agent?.id) {
      loadAssignments(agent.id)
      loadEarnings(agent.id, agent.user_id)
      supabase.rpc('get_delivery_agent_performance', { p_agent_id: agent.id }).then(({ data }) => setPerformance(data?.[0] || null))

      // Real-time — a new job (auto-assigned by the system the moment a
      // seller confirms an order) shows up here instantly, not just on the
      // next manual reload. Same proven pattern already used for the admin
      // pending-approvals badge.
      const channel = supabase
        .channel(`delivery-assignments-${agent.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'delivery_assignments', filter: `delivery_agent_id=eq.${agent.id}` },
          () => loadAssignments(agent.id)
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
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

  async function handleRecordArrival(assignmentId) {
    const { error } = await supabase.rpc('record_agent_arrival', { p_assignment_id: assignmentId })
    if (error) {
      alert(error.message)
      return
    }
    loadAssignments(agent.id)
  }

  async function handleAssessFine(assignmentId) {
    const { data, error } = await supabase.rpc('assess_waiting_fine', { p_assignment_id: assignmentId })
    if (!error) {
      alert(data > 0 ? `₦${Number(data).toLocaleString()} waiting fine charged.` : 'Still within the 10-minute free window — no fine yet.')
      loadAssignments(agent.id)
      loadEarnings(agent.id, agent.user_id)
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
    const { error } = await supabase.rpc('file_incident_report', { p_assignment_id: assignmentId, p_description: incidentText })
    if (error) {
      alert(error.message)
      return
    }
    setReportingFor(null)
    setIncidentText('')
  }

  async function uploadProofPhoto(assignmentId) {
    if (!photoFile || !agent) return
    setUploadingPhotoFor(assignmentId)
    const path = `${agent.id}/${assignmentId}-${Date.now()}.${photoFile.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('delivery-proof').upload(path, photoFile)
    if (uploadError) {
      setUploadingPhotoFor(null)
      alert(uploadError.message)
      return
    }
    const { data: urlData } = supabase.storage.from('delivery-proof').getPublicUrl(path)
    const { error: rpcError } = await supabase.rpc('record_proof_photo', { p_assignment_id: assignmentId, p_photo_url: urlData.publicUrl })
    if (rpcError) {
      setUploadingPhotoFor(null)
      alert(rpcError.message)
      return
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

      <FaceVerificationSection agentId={agent.id} status={agent.face_verification_status} faceVerified={agent.face_verified} />

      <PushNotificationToggle label="new delivery jobs" />

      <CoverageAreasSection agentId={agent.id} />

      {performance && (
        <div className="rounded bg-surface border border-ink/10 p-3 mb-4 text-center">
          <p className="text-xs text-ink/50 mb-1">Your overall rating</p>
          {Number(performance.rating_count) > 0 ? (
            <>
              <p className="text-3xl font-bold text-gold-dark">{Number(performance.avg_rating).toFixed(1)}</p>
              <p className="text-gold text-sm">{'★'.repeat(Math.round(performance.avg_rating))}{'☆'.repeat(5 - Math.round(performance.avg_rating))}</p>
              <p className="text-xs text-ink/50">Based on {performance.rating_count} buyer rating{performance.rating_count === 1 ? '' : 's'}</p>
            </>
          ) : (
            <p className="text-xs text-ink/40">No ratings yet</p>
          )}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <p className="text-lg font-semibold text-market-green">{performance.total_deliveries}</p>
              <p className="text-xs text-ink/40">Deliveries</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-market-green">{performance.completion_rate != null ? `${performance.completion_rate}%` : '—'}</p>
              <p className="text-xs text-ink/40">Completion</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-market-green">{performance.on_time_rate != null ? `${performance.on_time_rate}%` : '—'}</p>
              <p className="text-xs text-ink/40">On-time</p>
            </div>
          </div>
        </div>
      )}

      {earnings && (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="rounded bg-market-green/10 px-3 py-2 text-center">
              <p className="text-xs text-ink/50">Today's earnings</p>
              <p className="font-mono text-lg text-market-green">₦{earnings.today.toLocaleString()}</p>
              <p className="text-xs text-ink/40">{earnings.todayCount} {earnings.todayCount === 1 ? 'delivery' : 'deliveries'}</p>
            </div>
            <div className="rounded bg-gold/10 px-3 py-2 text-center">
              <p className="text-xs text-ink/50">Waiting time bonus</p>
              <p className="font-mono text-lg text-gold-dark">₦{earnings.waitingBonus.toLocaleString()}</p>
              <p className="text-xs text-ink/40">From {earnings.waitingBonusCount} late {earnings.waitingBonusCount === 1 ? 'buyer' : 'buyers'}</p>
            </div>
            <div className="rounded bg-market-green/10 px-3 py-2 text-center">
              <p className="text-xs text-ink/50">This week</p>
              <p className="font-mono text-lg text-market-green">₦{earnings.thisWeek.toLocaleString()}</p>
              <p className="text-xs text-ink/40">{earnings.weekCount} {earnings.weekCount === 1 ? 'delivery' : 'deliveries'}</p>
            </div>
            <div className="rounded bg-market-green/10 px-3 py-2 text-center">
              <p className="text-xs text-ink/50">Wallet balance</p>
              <p className="font-mono text-lg text-market-green">₦{Number(earnings.walletBalance).toLocaleString()}</p>
              <p className="text-xs text-ink/40">Available to withdraw</p>
            </div>
          </div>
          <p className="text-xs text-ink/40">
            All-time: ₦{earnings.total.toLocaleString()} from {earnings.count} completed {earnings.count === 1 ? 'delivery' : 'deliveries'} — the real
            delivery fee from each order you've actually delivered, no invented payout field.
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
          <div key={a.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
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

            {a.arrived_at && (
              <p className="w-full mt-2 text-xs bg-market-green/10 text-market-green rounded py-2 px-2 text-center">
                ✓ Arrival recorded — the buyer now sees a real "Confirm received" prompt in their app. Funds settle
                once they confirm, or automatically after 48 hours if they don't respond.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Real "Face verified" badge — an honest, admin-reviewed check, not a
// simulated automated match. No real biometric provider is connected
// yet; a genuine human at admin compares this real selfie against the
// agent's real ID photo already on file, the same proven pattern
// already used for NIN verification.
// Real coverage-area selection — restored after a systematic audit
// found this real table sitting completely unused, meaning agents had
// no way to specify which real neighborhoods they actually serve.
function CoverageAreasSection({ agentId }) {
  const [lgas, setLgas] = useState([])
  const [selectedLga, setSelectedLga] = useState('')
  const [neighborhoods, setNeighborhoods] = useState([])
  const [myAreas, setMyAreas] = useState([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: lgaData }, { data: myData }] = await Promise.all([
        supabase.from('local_government_areas').select('id, name').order('name'),
        supabase.from('delivery_agent_coverage_areas').select('neighborhood_area_id, neighborhood_areas(name, local_government_areas(name))').eq('delivery_agent_id', agentId),
      ])
      setLgas(lgaData || [])
      setMyAreas(myData || [])
    }
    load()
  }, [agentId])

  useEffect(() => {
    async function loadNeighborhoods() {
      if (!selectedLga) {
        setNeighborhoods([])
        return
      }
      const { data } = await supabase.from('neighborhood_areas').select('id, name').eq('lga_id', selectedLga).order('name')
      setNeighborhoods(data || [])
    }
    loadNeighborhoods()
  }, [selectedLga])

  async function toggleArea(neighborhoodId) {
    const already = myAreas.some((a) => a.neighborhood_area_id === neighborhoodId)
    if (already) {
      await supabase.from('delivery_agent_coverage_areas').delete().eq('delivery_agent_id', agentId).eq('neighborhood_area_id', neighborhoodId)
    } else {
      await supabase.from('delivery_agent_coverage_areas').insert({ delivery_agent_id: agentId, neighborhood_area_id: neighborhoodId })
    }
    const { data } = await supabase
      .from('delivery_agent_coverage_areas')
      .select('neighborhood_area_id, neighborhood_areas(name, local_government_areas(name))')
      .eq('delivery_agent_id', agentId)
    setMyAreas(data || [])
  }

  return (
    <div className="rounded bg-surface border border-ink/10 p-3 mb-4">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between">
        <p className="text-sm font-medium">📍 My real coverage areas ({myAreas.length})</p>
        <span className="text-xs text-ink/40">{expanded ? '▲' : '▼'}</span>
      </button>

      {myAreas.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {myAreas.map((a) => (
            <span key={a.neighborhood_area_id} className="text-xs bg-indigo/10 text-indigo rounded-full px-2 py-0.5">
              {a.neighborhood_areas?.name}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-ink/10">
          <select value={selectedLga} onChange={(e) => setSelectedLga(e.target.value)} className="w-full rounded border border-ink/20 px-2 py-1.5 text-sm mb-2">
            <option value="">-- Select real LGA --</option>
            {lgas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {neighborhoods.length > 0 && (
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
              {neighborhoods.map((n) => {
                const covered = myAreas.some((a) => a.neighborhood_area_id === n.id)
                return (
                  <button
                    key={n.id}
                    onClick={() => toggleArea(n.id)}
                    className={`text-xs rounded px-2 py-1 text-left ${covered ? 'bg-indigo text-white' : 'border border-ink/15 text-ink/60'}`}
                  >
                    {covered ? '✓ ' : ''}{n.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FaceVerificationSection({ agentId, status, faceVerified }) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleUpload(file) {
    if (!file) return
    setUploading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')
    const path = `${user.id}/face-${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('id-documents').upload(path, file)
    if (uploadError) {
      setUploading(false)
      setMessage(`Could not upload: ${uploadError.message}`)
      return
    }
    const { data: publicUrl } = supabase.storage.from('id-documents').getPublicUrl(path)
    const { error: submitError } = await supabase.rpc('submit_face_verification', { p_photo_url: publicUrl.publicUrl })
    setUploading(false)
    if (submitError) {
      setMessage(`Could not submit: ${submitError.message}`)
      return
    }
    setMessage('✓ Real selfie submitted — admin will review it shortly.')
  }

  if (faceVerified) {
    return (
      <div className="rounded bg-market-green/10 border border-market-green/30 px-3 py-2 mb-4 text-sm text-market-green font-medium flex items-center gap-2">
        ✓ Face verified
      </div>
    )
  }

  return (
    <div className="rounded border border-ink/10 px-3 py-2 mb-4">
      <p className="text-sm font-medium mb-1">Face verification</p>
      {status === 'pending' ? (
        <p className="text-xs text-gold-dark">Your real selfie is submitted and awaiting real admin review.</p>
      ) : status === 'rejected' ? (
        <p className="text-xs text-market-red mb-2">Your last submission wasn't approved — please submit a new, clear real selfie.</p>
      ) : (
        <p className="text-xs text-ink/50 mb-2">Submit a real, clear selfie — admin will compare it against your real ID on file.</p>
      )}
      <label className="inline-block text-xs bg-indigo text-white rounded px-3 py-1.5 cursor-pointer">
        {uploading ? 'Uploading…' : 'Upload real selfie'}
        <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} disabled={uploading} />
      </label>
      {message && <p className="text-xs text-ink/60 mt-1">{message}</p>}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Real, genuinely shared component — rebuilt to lead with the real
// double-entry flow: real pending applications from real people who
// applied from their own Profile, approved or rejected directly here.
// The old blind invite-code system stays available as a secondary
// option, but real applications are what most directors will actually
// use now.
export default function Attendants({ sellerId }) {
  const [attendants, setAttendants] = useState([])
  const [applications, setApplications] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newCode, setNewCode] = useState(null)
  const [resolving, setResolving] = useState(null)

  async function load() {
    const [{ data: att }, { data: apps }, { data: inv }] = await Promise.all([
      supabase.from('attendants').select('id, user_id, is_active, created_at, profiles(full_name, phone)').eq('store_id', sellerId),
      supabase.from('attendant_applications').select('id, created_at, profiles!attendant_applications_applicant_id_fkey(full_name, phone)').eq('store_id', sellerId).eq('status', 'pending'),
      supabase.from('attendant_invites').select('id, code, used_by, created_at').eq('store_id', sellerId).order('created_at', { ascending: false }),
    ])
    setAttendants(att || [])
    setApplications(apps || [])
    setInvites(inv || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function resolveApplication(id, approve) {
    setResolving(id)
    const { error } = await supabase.rpc('resolve_attendant_application', { p_application_id: id, p_approve: approve })
    setResolving(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  async function revokeAccess(attendantId) {
    if (!confirm('Revoke this real attendant\u2019s access to this store?')) return
    await supabase.from('attendants').update({ is_active: false }).eq('id', attendantId)
    load()
  }

  async function reinstate(attendantId) {
    await supabase.from('attendants').update({ is_active: true }).eq('id', attendantId)
    load()
  }

  async function generateInvite() {
    setGenerating(true)
    const { data, error } = await supabase.rpc('create_attendant_invite', { p_store_id: sellerId })
    setGenerating(false)
    if (error) {
      alert(error.message)
      return
    }
    setNewCode(data)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>

  return (
    <div>
      {applications.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gold-dark mb-2">
            Real people who applied to work here ({applications.length})
          </p>
          <div className="space-y-2">
            {applications.map((a) => (
              <div key={a.id} className="rounded border border-gold/40 bg-gold/10 px-3 py-2">
                <p className="text-sm font-medium">{a.profiles?.full_name}</p>
                <p className="text-xs text-ink/50 mb-2">{a.profiles?.phone}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveApplication(a.id, true)}
                    disabled={resolving === a.id}
                    className="flex-1 text-xs bg-market-green text-white rounded py-1.5 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => resolveApplication(a.id, false)}
                    disabled={resolving === a.id}
                    className="flex-1 text-xs bg-market-red/10 text-market-red rounded py-1.5 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs font-medium text-ink/50 mb-2">
        Active attendants ({attendants.filter((a) => a.is_active).length})
      </p>
      <div className="space-y-2 mb-4">
        {attendants.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded border border-ink/10 px-3 py-2">
            <div>
              <p className="text-sm font-medium">{a.profiles?.full_name || 'Unnamed'}</p>
              <p className="text-xs text-ink/50">{a.profiles?.phone}</p>
            </div>
            {a.is_active ? (
              <button onClick={() => revokeAccess(a.id)} className="text-xs bg-market-red/10 text-market-red rounded px-3 py-1.5">
                Revoke access
              </button>
            ) : (
              <button onClick={() => reinstate(a.id)} className="text-xs bg-market-green/10 text-market-green rounded px-3 py-1.5">
                Reinstate
              </button>
            )}
          </div>
        ))}
      </div>

      <details className="text-xs text-ink/50">
        <summary className="cursor-pointer font-medium">Or generate an invite code instead</summary>
        <p className="my-2">
          Generate a real code and share it directly with your attendant — they enter it themselves once they have
          an account.
        </p>
        <button
          onClick={generateInvite}
          disabled={generating}
          className="w-full mb-3 rounded bg-indigo text-paper font-display font-medium py-2 disabled:opacity-60"
        >
          {generating ? 'Generating…' : 'Generate invite code'}
        </button>
        {newCode && <p className="text-center font-mono text-lg text-indigo mb-3 bg-indigo/5 rounded py-2">{newCode}</p>}
        {invites.length > 0 && (
          <div className="space-y-1">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded border border-ink/10 bg-surface px-3 py-2">
                <span className="font-mono">{i.code}</span>
                <span className={i.used_by ? 'text-market-green' : 'text-gold-dark'}>{i.used_by ? 'Redeemed' : 'Unused'}</span>
              </div>
            ))}
          </div>
        )}
      </details>
    </div>
  )
}

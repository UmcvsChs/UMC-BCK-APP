import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Real, genuinely shared component — only ever loaded by the standalone
// Director dashboard now, not bundled into the simple single-store
// Seller view where it has no real reason to exist.
export default function Attendants({ sellerId }) {
  const [attendants, setAttendants] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newCode, setNewCode] = useState(null)

  async function load() {
    const [{ data: att }, { data: inv }] = await Promise.all([
      supabase.from('attendants').select('id, is_active, created_at').eq('store_id', sellerId),
      supabase.from('attendant_invites').select('id, code, used_by, created_at').eq('store_id', sellerId).order('created_at', { ascending: false }),
    ])
    setAttendants(att || [])
    setInvites(inv || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

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
      <p className="text-sm text-ink/60 mb-3">
        Generate a code and share it with your attendant — they enter it themselves once they have an account.
      </p>

      <button
        onClick={generateInvite}
        disabled={generating}
        className="w-full mb-4 rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
      >
        {generating ? 'Generating…' : 'Generate invite code'}
      </button>

      {newCode && (
        <p className="text-center font-mono text-lg text-indigo mb-4 bg-indigo/5 rounded py-2">{newCode}</p>
      )}

      <p className="text-xs font-medium text-ink/50 mb-2">Active attendants ({attendants.filter((a) => a.is_active).length})</p>

      {invites.length > 0 && (
        <div className="space-y-1">
          {invites.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-xs rounded border border-ink/10 bg-surface px-3 py-2">
              <span className="font-mono">{i.code}</span>
              <span className={i.used_by ? 'text-market-green' : 'text-gold-dark'}>
                {i.used_by ? 'Redeemed' : 'Unused'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


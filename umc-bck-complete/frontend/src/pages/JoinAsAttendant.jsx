import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function JoinAsAttendant() {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.rpc('join_as_attendant', { p_code: code.toUpperCase() })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="p-4 max-w-sm mx-auto text-center py-16">
        <h1 className="text-xl font-display font-semibold text-indigo mb-2">You're in</h1>
        <p className="text-sm text-ink/60">You now have restricted attendant access to that store.</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Join as an attendant</h1>
      <p className="text-sm text-ink/60 mb-6">Enter the code the store owner shared with you.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Invite code"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono text-center uppercase"
        />

        {error && (
          <p role="alert" className="text-sm text-market-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
        >
          {submitting ? 'Joining…' : 'Join store'}
        </button>
      </form>
    </div>
  )
}

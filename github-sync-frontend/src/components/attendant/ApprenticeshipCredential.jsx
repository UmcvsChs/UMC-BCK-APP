import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Real "Verified Trading Apprenticeship" — formalizing the Igba Boi
// system already living inside this real Director/Attendant structure.
// Computed entirely from real, existing tenure and real, existing sales
// history — nothing new to fill in, nothing invented.
export default function ApprenticeshipCredential() {
  const [credential, setCredential] = useState(null)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.rpc('get_apprenticeship_credential', { p_user_id: user.id })
      setCredential(data?.[0] || null)
    }
    load()
  }, [])

  if (!credential) return null

  const isVerified = credential.credential_tier.startsWith('Verified')

  return (
    <div
      className={`rounded border-2 px-3 py-2 mb-3 ${
        isVerified ? 'border-gold bg-gold/10' : 'border-ink/10 bg-surface'
      }`}
    >
      <p className={`text-xs font-semibold ${isVerified ? 'text-gold-dark' : 'text-ink/60'}`}>
        {isVerified ? '🏅' : '📈'} {credential.credential_tier}
      </p>
      {credential.total_days_active != null && (
        <p className="text-xs text-ink/50 mt-0.5">
          {credential.total_days_active} real day{credential.total_days_active === 1 ? '' : 's'} · {credential.total_real_sales_recorded} real sale
          {credential.total_real_sales_recorded === 1 ? '' : 's'} recorded · ₦{Number(credential.total_real_sales_value).toLocaleString()} genuine value
        </p>
      )}
      {isVerified && (
        <p className="text-xs text-gold-dark mt-1">
          This real, portable credential travels with you — it's yours if you ever register your own store.
        </p>
      )}
    </div>
  )
}

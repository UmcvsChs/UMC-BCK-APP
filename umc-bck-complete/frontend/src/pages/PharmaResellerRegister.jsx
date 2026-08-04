import { useState } from 'react'
import { supabase } from '../lib/supabase'

const BUSINESS_TYPES = ['Pharmacy', 'Clinic', 'Hospital']

export default function PharmaResellerRegister() {
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0])
  const [licenseNumber, setLicenseNumber] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('pharma_reseller_verifications').insert({
      buyer_id: user.id,
      business_type: businessType,
      license_number: licenseNumber,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="p-4 max-w-sm mx-auto text-center py-16">
        <h1 className="text-xl font-display font-semibold text-hub-pharma mb-2">Submitted for review</h1>
        <p className="text-sm text-ink/60">
          Once approved, you'll be able to purchase bulk medication at reseller pricing.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h1 className="text-xl font-display font-semibold text-hub-pharma mb-1">Register as a reseller buyer</h1>
      <p className="text-sm text-ink/60 mb-6">
        Pharmacies, clinics, and hospitals can apply for verified access to bulk medication pricing. Every
        application is manually reviewed.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="businessType" className="block text-sm font-medium mb-1">
            Business type
          </label>
          <select
            id="businessType"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-hub-pharma focus:outline-none"
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="license" className="block text-sm font-medium mb-1">
            License / registration number
          </label>
          <input
            id="license"
            required
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-hub-pharma focus:outline-none"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-market-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-hub-pharma text-paper font-display font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  )
}

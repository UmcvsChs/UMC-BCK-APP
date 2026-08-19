import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DEVICE_TYPES = ['Phones', 'Laptops', 'Tablets']
const SPECIALTIES = ['Screen replacement', 'Battery', 'Water damage', 'Charging port', 'Software issues', 'Camera']

export default function RepairerRegister() {
  const navigate = useNavigate()
  const [deviceTypes, setDeviceTypes] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [yearsExperience, setYearsExperience] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function toggle(list, setList, value) {
    setList((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (deviceTypes.length === 0) {
      setError('Select at least one device type you can repair.')
      return
    }
    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('repairers').insert({
      user_id: user.id,
      device_types: deviceTypes,
      specialties,
      years_experience: yearsExperience ? Number(yearsExperience) : null,
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
      <div className="p-4 max-w-md mx-auto text-center py-16">
        <h1 className="text-xl font-display font-semibold text-hub-phones mb-2">Registration submitted</h1>
        <p className="text-sm text-ink/60 mb-4">
          Your repairer profile is pending admin review. You'll appear to buyers once approved.
        </p>
        <button onClick={() => navigate('/phones')} className="text-hub-phones font-medium text-sm">
          Back to Phones & Tech
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-hub-phones mb-1">Become a repairer</h1>
      <p className="text-sm text-ink/60 mb-6">Every repairer is reviewed before appearing to buyers.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset>
          <legend className="block text-sm font-medium mb-2">Device types you repair</legend>
          <div className="space-y-1">
            {DEVICE_TYPES.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deviceTypes.includes(d)}
                  onChange={() => toggle(deviceTypes, setDeviceTypes, d)}
                  className="accent-hub-phones"
                />
                {d}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="block text-sm font-medium mb-2">Specialties</legend>
          <div className="space-y-1">
            {SPECIALTIES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={specialties.includes(s)}
                  onChange={() => toggle(specialties, setSpecialties, s)}
                  className="accent-hub-phones"
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="years" className="block text-sm font-medium mb-1">
            Years of experience
          </label>
          <input
            id="years"
            type="number"
            min="0"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-phones focus:outline-none"
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
          className="w-full rounded bg-hub-phones text-paper font-display font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  )
}

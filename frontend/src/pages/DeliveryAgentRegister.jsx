import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DeliveryAgentRegister() {
  const navigate = useNavigate()
  const [lgas, setLgas] = useState([])
  const [lgaId, setLgaId] = useState('')
  const [vehicleType, setVehicleType] = useState('motorcycle')
  const [isCompany, setIsCompany] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function loadLgas() {
      const { data } = await supabase
        .from('local_government_areas')
        .select('id, name, states!inner(is_launched)')
        .eq('states.is_launched', true)
        .order('name')
      setLgas(data || [])
    }
    loadLgas()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('delivery_agents').insert({
      user_id: user.id,
      lga_id: lgaId,
      vehicle_type: vehicleType,
      is_company: isCompany,
      company_name: isCompany ? companyName : null,
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
        <h1 className="text-xl font-display font-semibold text-indigo mb-2">Registration submitted</h1>
        <p className="text-sm text-ink/60 mb-4">
          Your delivery agent profile is pending admin review. You can go online for deliveries once approved.
        </p>
        <button onClick={() => navigate('/delivery')} className="text-indigo font-medium text-sm">
          Go to Delivery Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Become a delivery agent</h1>
      <p className="text-sm text-ink/60 mb-6">
        Orders are assigned based on your LGA and your track record of following through — every registration is reviewed first.
      </p>

      <div className="flex gap-1 mb-6 rounded border border-ink/10 p-1">
        <button
          type="button"
          onClick={() => setIsCompany(false)}
          className={`flex-1 text-sm rounded px-3 py-2 font-medium ${!isCompany ? 'bg-indigo text-white' : 'text-ink/60'}`}
        >
          Individual rider
        </button>
        <button
          type="button"
          onClick={() => setIsCompany(true)}
          className={`flex-1 text-sm rounded px-3 py-2 font-medium ${isCompany ? 'bg-indigo text-white' : 'text-ink/60'}`}
        >
          Fleet / logistics company
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isCompany && (
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium mb-1">
              Company name
            </label>
            <input
              id="companyName"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
            />
          </div>
        )}
        <div>
          <label htmlFor="lga" className="block text-sm font-medium mb-1">
            Your home LGA
          </label>
          <select
            id="lga"
            required
            value={lgaId}
            onChange={(e) => setLgaId(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
          >
            <option value="">Select an LGA</option>
            {lgas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="vehicleType" className="block text-sm font-medium mb-1">
            Vehicle type
          </label>
          <select
            id="vehicleType"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
          >
            <option value="motorcycle">Motorcycle</option>
            <option value="tricycle">Tricycle (Keke)</option>
            <option value="car">Car</option>
            <option value="bicycle">Bicycle</option>
            <option value="on_foot">On foot</option>
          </select>
        </div>

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
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  )
}

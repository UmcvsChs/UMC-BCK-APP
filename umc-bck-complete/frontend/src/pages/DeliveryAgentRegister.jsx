import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DeliveryAgentRegister() {
  const navigate = useNavigate()
  const [lgas, setLgas] = useState([])
  const [lgaId, setLgaId] = useState('')
  const [vehicleType, setVehicleType] = useState('motorcycle')
  const [homeArea, setHomeArea] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [vehicleOwnerName, setVehicleOwnerName] = useState('')
  const [vehicleOwnerAddress, setVehicleOwnerAddress] = useState('')
  const [vehicleRegFile, setVehicleRegFile] = useState(null)
  const [isCompany, setIsCompany] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [cacNumber, setCacNumber] = useState('')
  const [tin, setTin] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [stateOfIncorporation, setStateOfIncorporation] = useState('Kaduna State')
  const [yearIncorporated, setYearIncorporated] = useState('')
  const [directorName, setDirectorName] = useState('')
  const [cacCertFile, setCacCertFile] = useState(null)
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

    let cacCertificateUrl = null
    if (isCompany && cacCertFile) {
      const path = `${user.id}/cac-cert-${Date.now()}.${cacCertFile.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('company-documents').upload(path, cacCertFile)
      if (uploadError) {
        setSubmitting(false)
        setError(uploadError.message)
        return
      }
      const { data: urlData } = supabase.storage.from('company-documents').getPublicUrl(path)
      cacCertificateUrl = urlData.publicUrl
    }

    let vehicleRegUrl = null
    if (vehicleRegFile) {
      const path = `${user.id}/vehicle-reg-${Date.now()}.${vehicleRegFile.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('id-documents').upload(path, vehicleRegFile)
      if (uploadError) {
        setSubmitting(false)
        setError(uploadError.message)
        return
      }
      const { data: urlData } = supabase.storage.from('id-documents').getPublicUrl(path)
      vehicleRegUrl = urlData.publicUrl
    }

    const { error } = await supabase.from('delivery_agents').insert({
      user_id: user.id,
      lga_id: lgaId,
      vehicle_type: vehicleType,
      home_area: homeArea || null,
      plate_number: plateNumber || null,
      vehicle_owner_name: vehicleOwnerName || null,
      vehicle_owner_address: vehicleOwnerAddress || null,
      vehicle_reg_document_url: vehicleRegUrl,
      is_company: isCompany,
      company_name: isCompany ? companyName : null,
      cac_number: isCompany ? cacNumber || null : null,
      tin: isCompany ? tin || null : null,
      business_address: isCompany ? businessAddress || null : null,
      state_of_incorporation: isCompany ? stateOfIncorporation : null,
      year_incorporated: isCompany && yearIncorporated ? Number(yearIncorporated) : null,
      director_name: isCompany ? directorName || null : null,
      cac_certificate_url: cacCertificateUrl,
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
              Registered company name
            </label>
            <input
              id="companyName"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Exact name as on CAC certificate"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
          </div>
        )}
        {isCompany && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">CAC registration number</label>
              <input
                value={cacNumber}
                onChange={(e) => setCacNumber(e.target.value)}
                placeholder="RC number (Ltd) or BN number (business name)"
                className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax Identification Number (TIN)</label>
              <input
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                placeholder="FIRS TIN — 10 digits"
                className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Registered business address</label>
              <input
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Address as on CAC certificate — must be verifiable"
                className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">State of incorporation</label>
                <select
                  value={stateOfIncorporation}
                  onChange={(e) => setStateOfIncorporation(e.target.value)}
                  className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
                >
                  <option>Kaduna State</option>
                  <option>Abuja (FCT)</option>
                  <option>Kano State</option>
                  <option>Lagos State</option>
                  <option>Other state</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year incorporated</label>
                <input
                  type="number"
                  value={yearIncorporated}
                  onChange={(e) => setYearIncorporated(e.target.value)}
                  placeholder="e.g. 2019"
                  className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Upload CAC certificate</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setCacCertFile(e.target.files[0])}
                className="w-full text-sm"
              />
            </div>
            <div className="pt-2 border-t border-ink/10">
              <p className="text-xs text-ink/50 mb-2">
                The director or company representative who signs the UMC-BCK SLA — legally accountable for the
                company's operations on the platform.
              </p>
              <label className="block text-sm font-medium mb-1">Full name of director / signatory</label>
              <input
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                placeholder="Name as on NIN or international passport"
                className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
              />
            </div>
          </>
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
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
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
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          >
            <option value="motorcycle">Motorcycle</option>
            <option value="tricycle">Tricycle (Keke)</option>
            <option value="car">Car</option>
            <option value="bicycle">Bicycle</option>
            <option value="on_foot">On foot</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Home area / neighbourhood</label>
          <input
            value={homeArea}
            onChange={(e) => setHomeArea(e.target.value)}
            placeholder="e.g. Shagari Low Cost, Barnawa — street or landmark"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
          />
        </div>

        <div className="rounded border border-gold/30 bg-gold/10 p-3 space-y-2">
          <p className="text-sm font-medium">🚗 Vehicle registration document</p>
          <p className="text-xs text-ink/60">
            Creates a real, traceable record — even if the vehicle belongs to someone else, their registered address
            creates accountability. Required for all agents.
          </p>
          <div>
            <label className="block text-xs font-medium mb-1">Plate number / registration number</label>
            <input
              required
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              placeholder="e.g. KD 123 ABC"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Registered owner name</label>
            <input
              required
              value={vehicleOwnerName}
              onChange={(e) => setVehicleOwnerName(e.target.value)}
              placeholder="Name on the vehicle papers"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Registered owner address</label>
            <input
              required
              value={vehicleOwnerAddress}
              onChange={(e) => setVehicleOwnerAddress(e.target.value)}
              placeholder="Address on vehicle registration document"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Upload vehicle registration document</label>
            <input
              type="file"
              required
              accept="image/*,application/pdf"
              onChange={(e) => setVehicleRegFile(e.target.files[0])}
              className="w-full text-sm"
            />
          </div>
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

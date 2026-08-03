import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PrescriptionRequest() {
  const [sellers, setSellers] = useState([])
  const [sellerId, setSellerId] = useState('')
  const [medicationName, setMedicationName] = useState('')
  const [dosage, setDosage] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [myRequests, setMyRequests] = useState([])

  async function loadSellers() {
    const { data } = await supabase
      .from('sellers')
      .select('id, store_name')
      .eq('primary_hub', 'pharma_medical')
      .eq('verification_status', 'approved')
      .order('store_name')
    setSellers(data || [])
  }

  async function loadMyRequests() {
    const { data } = await supabase
      .from('prescription_requests')
      .select('id, medication_name, requested_quantity, status, created_at')
      .order('created_at', { ascending: false })
    setMyRequests(data || [])
  }

  useEffect(() => {
    loadSellers()
    loadMyRequests()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError('A photo of the prescription is required — this can never be a public catalogue item.')
      return
    }
    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Private bucket — folder convention {buyer_id}/{filename}, matching the
    // storage RLS that scopes visibility to the buyer, the assigned seller,
    // and admin only.
    const path = `${user.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('prescriptions').upload(path, file)
    if (uploadError) {
      setError(uploadError.message)
      setSubmitting(false)
      return
    }

    const { error } = await supabase.rpc('submit_prescription_request', {
      p_seller_id: sellerId,
      p_medication_name: medicationName,
      p_prescription_image_url: path,
      p_dosage: dosage || null,
      p_requested_quantity: quantity ? Number(quantity) : null,
      p_notes: notes || null,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }

    setMedicationName('')
    setDosage('')
    setQuantity('')
    setNotes('')
    setFile(null)
    loadMyRequests()
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-hub-pharma mb-1">Request a prescription</h1>
      <p className="text-sm text-ink/60 mb-6">
        A pharmacist reviews every request before anything proceeds — this is never a public catalogue item.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label htmlFor="seller" className="block text-sm font-medium mb-1">
            Pharmacy
          </label>
          <select
            id="seller"
            required
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-hub-pharma focus:outline-none"
          >
            <option value="">Select a pharmacy</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="medication" className="block text-sm font-medium mb-1">
            Medication name
          </label>
          <input
            id="medication"
            required
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-hub-pharma focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="dosage" className="block text-sm font-medium mb-1">
            Dosage (optional)
          </label>
          <input
            id="dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-hub-pharma focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium mb-1">
            Quantity requested
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Defaults to 5 unless dosage is specified"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-hub-pharma focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="prescriptionPhoto" className="block text-sm font-medium mb-1">
            Prescription photo <span className="text-market-red">*required</span>
          </label>
          <input
            id="prescriptionPhoto"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
          {submitting ? 'Submitting…' : 'Submit for pharmacist review'}
        </button>
      </form>

      <h2 className="text-sm font-display font-semibold text-ink/70 mb-2">Your requests</h2>
      {myRequests.length === 0 && <p className="text-sm text-ink/50">No requests yet.</p>}
      <div className="space-y-2">
        {myRequests.map((r) => (
          <div key={r.id} className="rounded border border-ink/10 bg-white px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{r.medication_name}</p>
              <p className="text-xs text-ink/50">Qty {r.requested_quantity}</p>
            </div>
            <span
              className={`text-xs font-medium capitalize ${
                r.status === 'approved'
                  ? 'text-market-green'
                  : r.status === 'declined'
                    ? 'text-market-red'
                    : 'text-gold-dark'
              }`}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

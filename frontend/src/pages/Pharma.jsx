import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import HubBrowse from '../components/HubBrowse'

// Deliberately excludes Bulk Medication (carton-only pricing, doesn't fit a
// simple products.price display — needs its own view) and anything
// controlled/prescription (must never appear in a public catalogue at all —
// see prescription_requests for that path instead).
const PHARMA_CATEGORIES = ['Common Medications', 'Specialized — Psychiatric', 'Specialized — Ophthalmology', 'Specialized — ENT', 'Equipment', 'Personal Care']

export default function Pharma() {
  return (
    <div>
      <div className="px-4 pt-4 space-y-2">
        <Link
          to="/pharma/prescription-request"
          className="block rounded bg-hub-pharma/10 border border-hub-pharma/30 px-3 py-2 text-sm text-hub-pharma font-medium"
        >
          Need a controlled or prescription medication? Request it here — pharmacist review required →
        </Link>
        <Link
          to="/pharma/reseller-register"
          className="block rounded bg-hub-pharma/10 border border-hub-pharma/30 px-3 py-2 text-sm text-hub-pharma font-medium"
        >
          Pharmacy, clinic, or hospital? Register for bulk medication access →
        </Link>
        <Link
          to="/verify"
          className="block rounded bg-ink/5 border border-ink/10 px-3 py-2 text-sm text-ink/60 font-medium"
        >
          Verify a transaction →
        </Link>
      </div>

      <BulkMedicationSection />

      <HubBrowse
        hub="pharma_medical"
        title="Pharma & Medical"
        accentClass="bg-hub-pharma"
        categories={PHARMA_CATEGORIES}
        demandNote="Equipment and bulk medication requests only — controlled or prescription medication can never be requested this way. Use the prescription request form above instead."
      />
    </div>
  )
}

// Real, gated Bulk Medication browse — restored after a systematic
// audit found this real category had genuinely no way to be listed or
// browsed anywhere, despite dedicated real infrastructure existing.
// Correctly locked behind real, verified reseller status — never shown
// publicly.
function BulkMedicationSection() {
  const [verified, setVerified] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const { data: isVerified } = await supabase.rpc('is_verified_pharma_reseller', { p_buyer_id: user.id })
      setVerified(isVerified)

      if (isVerified) {
        const { data } = await supabase
          .from('products')
          .select('id, name, sellers(store_name), product_bulk_medication_details(carton_size, half_carton_price, full_carton_price)')
          .eq('hub', 'pharma_medical')
          .eq('category', 'Bulk Medication')
          .eq('status', 'live')
        setProducts((data || []).filter((p) => p.product_bulk_medication_details))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return null
  if (!verified) return null

  return (
    <div className="px-4 mb-4">
      <p className="text-sm font-medium mb-2">💊 Real bulk medication — verified reseller access</p>
      {products.length === 0 ? (
        <p className="text-xs text-ink/50">No real bulk medication listed right now.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-ink/50">{p.sellers?.store_name} · Carton of {p.product_bulk_medication_details.carton_size}</p>
              <div className="flex gap-3 mt-1 text-xs">
                {p.product_bulk_medication_details.half_carton_price && (
                  <span>Half: ₦{Number(p.product_bulk_medication_details.half_carton_price).toLocaleString()}</span>
                )}
                {p.product_bulk_medication_details.full_carton_price && (
                  <span className="font-medium text-indigo">Full: ₦{Number(p.product_bulk_medication_details.full_carton_price).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


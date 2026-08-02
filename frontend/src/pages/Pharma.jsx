import { Link } from 'react-router-dom'
import HubBrowse from '../components/HubBrowse'

// Deliberately excludes Bulk Medication (carton-only pricing, doesn't fit a
// simple products.price display — needs its own view) and anything
// controlled/prescription (must never appear in a public catalogue at all —
// see prescription_requests for that path instead).
const PHARMA_CATEGORIES = ['Equipment', 'Personal Care']

export default function Pharma() {
  return (
    <div>
      <div className="px-4 pt-4">
        <Link
          to="/pharma/prescription-request"
          className="block rounded bg-hub-pharma/10 border border-hub-pharma/30 px-3 py-2 text-sm text-hub-pharma font-medium"
        >
          Need a controlled or prescription medication? Request it here — pharmacist review required →
        </Link>
      </div>
      <HubBrowse
        hub="pharma_medical"
        title="Pharma & Medical"
        accentClass="bg-hub-pharma"
        categories={PHARMA_CATEGORIES}
      />
    </div>
  )
}

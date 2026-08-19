import { Link } from 'react-router-dom'
import HubBrowse from '../components/HubBrowse'

// Real, genuine market gap found and corrected — Motorcycles, Tricycles
// & Accessories was never a real hub, despite being one of the most
// significant real markets in Northern Nigeria (the fastest, most
// widely used form of transportation), with a real, growing electric
// motorbike segment on top of it.
const MOTORCYCLE_CATEGORIES = ['New Motorcycles', 'Used Motorcycles', 'Electric Motorbikes', 'Tricycles (Keke)', 'Spare Parts & Accessories']

export default function Motorcycles() {
  return (
    <div>
      <div className="px-4 pt-4 space-y-2">
        <Link
          to="/instalment"
          className="block rounded bg-hub-motorcycle/10 border border-hub-motorcycle/30 px-3 py-2 text-sm text-hub-motorcycle font-medium"
        >
          💳 Real hire purchase / instalment available on select motorcycles & tricycles →
        </Link>
        <Link
          to="/verify"
          className="block rounded bg-ink/5 border border-ink/10 px-3 py-2 text-sm text-ink/60 font-medium"
        >
          Verify a transaction →
        </Link>
      </div>
      <HubBrowse
        hub="motorcycles_tricycles"
        title="Motorcycles, Tricycles & Accessories"
        accentClass="bg-hub-motorcycle"
        categories={MOTORCYCLE_CATEGORIES}
      />
    </div>
  )
}

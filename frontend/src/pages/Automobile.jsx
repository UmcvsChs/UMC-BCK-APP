import { Link } from 'react-router-dom'
import HubBrowse from '../components/HubBrowse'

const AUTOMOBILE_CATEGORIES = ['Vehicles', 'Parts & Accessories']

export default function Automobile() {
  return (
    <div>
      <div className="px-4 pt-4">
        <Link
          to="/verify"
          className="block rounded bg-ink/5 border border-ink/10 px-3 py-2 text-sm text-ink/60 font-medium"
        >
          Verify a transaction →
        </Link>
      </div>
      <HubBrowse
        hub="automobile"
        title="Automobile"
        accentClass="bg-hub-automobile"
        categories={AUTOMOBILE_CATEGORIES}
      />
    </div>
  )
}

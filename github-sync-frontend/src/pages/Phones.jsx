import { Link } from 'react-router-dom'
import HubBrowse from '../components/HubBrowse'

const PHONES_CATEGORIES = ['New Phones', 'Accessories', 'Laptops & Tablets', 'Internet Gear']

export default function Phones() {
  return (
    <div>
      <div className="px-4 pt-4 space-y-2">
        <Link
          to="/phones/swap"
          className="block rounded bg-hub-phones/10 border border-hub-phones/30 px-3 py-2 text-sm text-hub-phones font-medium"
        >
          Kankara Swap — trade your device for another →
        </Link>
        <Link
          to="/phones/repair"
          className="block rounded bg-hub-phones/10 border border-hub-phones/30 px-3 py-2 text-sm text-hub-phones font-medium"
        >
          Need a repair? Get a real diagnosis and quote →
        </Link>
      </div>
      <HubBrowse
        hub="phones_tech"
        title="Phones & Tech"
        accentClass="bg-hub-phones"
        categories={PHONES_CATEGORIES}
      />
    </div>
  )
}

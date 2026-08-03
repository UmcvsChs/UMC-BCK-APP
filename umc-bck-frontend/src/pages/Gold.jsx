import { Link } from 'react-router-dom'
import HubBrowse from '../components/HubBrowse'

const GOLD_CATEGORIES = ['Pure Gold & Precious Metals', 'Fashion & Costume Jewelry']

export default function Gold() {
  return (
    <div>
      <div className="px-4 pt-4 space-y-2">
        <Link
          to="/gold/trade-in"
          className="block rounded bg-hub-gold/10 border border-hub-gold/30 px-3 py-2 text-sm text-gold-dark font-medium"
        >
          Have gold or jewelry to trade in? Cash buyback or exchange →
        </Link>
        <Link
          to="/verify"
          className="block rounded bg-ink/5 border border-ink/10 px-3 py-2 text-sm text-ink/60 font-medium"
        >
          Verify a transaction →
        </Link>
      </div>
      <HubBrowse
        hub="gold_jewelry"
        title="Gold & Jewelry"
        accentClass="bg-hub-gold"
        categories={GOLD_CATEGORIES}
      />
    </div>
  )
}

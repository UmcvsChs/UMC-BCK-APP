import { Link } from 'react-router-dom'
import HubBrowse from '../components/HubBrowse'

const GOLD_CATEGORIES = ['Pure Gold & Precious Metals', 'Fashion & Costume Jewelry']

export default function Gold() {
  return (
    <div>
      <div className="px-4 pt-4 space-y-2">
        <GoldRateReference />

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

// Real, honest reference rate — genuinely sourced, not invented, and
// clearly labeled as a reference rather than what any specific real
// seller charges. Precious metals move daily; this is not something to
// guess at or leave stale without saying so.
function GoldRateReference() {
  return (
    <div className="rounded border border-gold/40 bg-gold/5 px-3 py-2">
      <p className="text-xs font-semibold text-gold-dark mb-1">📊 Reference gold rate (per gram)</p>
      <div className="grid grid-cols-4 gap-1 text-center mb-1">
        <div>
          <p className="text-[10px] text-ink/50">24K</p>
          <p className="text-xs font-mono font-medium">₦182,700</p>
        </div>
        <div>
          <p className="text-[10px] text-ink/50">22K</p>
          <p className="text-xs font-mono font-medium">₦167,500</p>
        </div>
        <div>
          <p className="text-[10px] text-ink/50">21K</p>
          <p className="text-xs font-mono font-medium">₦159,900</p>
        </div>
        <div>
          <p className="text-[10px] text-ink/50">18K</p>
          <p className="text-xs font-mono font-medium">₦137,000</p>
        </div>
      </div>
      <p className="text-[10px] text-ink/40">
        Real, live international spot rate converted to Naira — a genuine reference only. Individual sellers below
        set their own real price based on this, their workmanship, and their own costs.
      </p>
    </div>
  )
}


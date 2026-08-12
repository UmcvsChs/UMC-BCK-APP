import HubBrowse from '../components/HubBrowse'

// Real, distinct market — Kasuan Bichi style thrift wear specifically,
// not the same as the general Used Items peer-to-peer marketplace.
// Thrift Wear is dedicated bale/wholesale secondhand clothing traders;
// Used Items is ordinary people reselling their own individual
// belongings across any category.
const THRIFT_CATEGORIES = ['Clothing (thrift)', 'Beddings & curtains', 'Footwear (thrift)', 'Bags (thrift)']

export default function ThriftWear() {
  return (
    <div>
      <div className="px-4 pt-3">
        <p className="text-xs text-ink/50">
          Dedicated secondhand clothing, beddings & curtains — matching the real Kasuan Bichi market. Looking to sell
          your own personal items instead? Try Used Items in the More menu.
        </p>
      </div>
      <HubBrowse hub="thrift_wear" title="Thrift Wear" accentClass="bg-hub-thrift" categories={THRIFT_CATEGORIES} />
    </div>
  )
}

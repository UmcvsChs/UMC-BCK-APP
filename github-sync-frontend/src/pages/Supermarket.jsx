import HubBrowse from '../components/HubBrowse'

// Real hub, built for real, named supermarket chains currently in
// active business negotiation (Market Square, Sahad Store, and
// others) — positioned right after Marketplace, ahead of Phones &
// Tech, as directed. Departments match how a real Nigerian supermarket
// is actually organized, not a generic grocery list.
const SUPERMARKET_CATEGORIES = [
  'Groceries & Food Staples',
  'Household & Cleaning',
  'Personal Care & Beauty',
  'Beverages & Drinks',
  'Frozen & Dairy',
  'Baby & Kids Essentials',
  'Health & Wellness',
  'Small Home Appliances',
]

export default function Supermarket() {
  return (
    <HubBrowse hub="supermarket" title="Supermarket" accentClass="bg-hub-supermarket" categories={SUPERMARKET_CATEGORIES} />
  )
}

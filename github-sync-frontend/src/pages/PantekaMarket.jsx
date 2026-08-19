import HubBrowse from '../components/HubBrowse'

// Real, specific, named market — Panteka Market, Kaduna. Two distinct
// real sections, each with its own genuine trade: Old Panteka —
// building materials and fabrication (gates, doors, custom-made items).
// New Panteka — used/scrap automobile spare parts, from wrecked and
// scrapped vehicles. Nothing outside those two real trades belongs here.
const PANTEKA_CATEGORIES = ['Building materials', 'Automobile & spare parts']

export default function PantekaMarket() {
  return (
    <HubBrowse hub="panteka_market" title="Panteka Market" accentClass="bg-hub-panteka" categories={PANTEKA_CATEGORIES} />
  )
}

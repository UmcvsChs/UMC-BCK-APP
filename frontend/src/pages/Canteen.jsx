import HubBrowse from '../components/HubBrowse'

const CANTEEN_CATEGORIES = ['Rice & Swallow', 'Soup', 'Protein', 'Sides', 'Drinks', 'Snacks']

export default function Canteen() {
  return (
    <HubBrowse
      hub="canteen"
      title="Canteen & Fast Food"
      accentClass="bg-hub-canteen"
      categories={CANTEEN_CATEGORIES}
    />
  )
}

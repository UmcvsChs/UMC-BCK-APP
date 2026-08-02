import HubBrowse from '../components/HubBrowse'

const AUTOMOBILE_CATEGORIES = ['Vehicles', 'Parts & Accessories']

export default function Automobile() {
  return (
    <HubBrowse
      hub="automobile"
      title="Automobile"
      accentClass="bg-hub-automobile"
      categories={AUTOMOBILE_CATEGORIES}
    />
  )
}

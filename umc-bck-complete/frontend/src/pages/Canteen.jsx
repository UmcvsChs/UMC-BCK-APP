import HubBrowse from '../components/HubBrowse'

const CANTEEN_CATEGORIES = ['Nigerian Meals', 'Northern Dishes', 'Fast Food', 'Shawarma', 'Suya & Grills', 'Pizza', 'Cakes & Desserts', 'Drinks']

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

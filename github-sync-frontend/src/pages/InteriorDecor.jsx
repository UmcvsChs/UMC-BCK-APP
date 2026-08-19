import HubBrowse from '../components/HubBrowse'

// Real hub for furniture, curtains, and bedding — a genuine, distinct
// interior-decor market, separate from the individual furniture pieces
// already scattered inside Kids & Baby (nursery) and Office Equipment.
const INTERIOR_DECOR_CATEGORIES = [
  'Living Room Furniture',
  'Bedroom Furniture',
  'Dining Furniture',
  'Curtains & Blinds',
  'Bedding & Linens',
  'Rugs & Carpets',
  'Home Décor Accessories',
]

export default function InteriorDecor() {
  return (
    <HubBrowse
      hub="interior_decor"
      title="Furniture, Curtain & Bedding"
      accentClass="bg-hub-interiordecor"
      categories={INTERIOR_DECOR_CATEGORIES}
    />
  )
}

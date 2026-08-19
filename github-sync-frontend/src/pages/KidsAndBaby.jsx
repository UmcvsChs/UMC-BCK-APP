import HubBrowse from '../components/HubBrowse'

// Real hub, built directly from field-report feedback and ratified in
// the team's own meeting — not a generic add-on. 10 real groups,
// covering apparel through age 13, footwear, feeding/care, school &
// travel, toys (organized by type, not gender — global best practice),
// nursery & kids furniture, safety, party supplies, gift sets, and
// maternity/postpartum.
const KIDS_BABY_CATEGORIES = [
  'Apparel (0-13 years)',
  'Footwear',
  'Baby Feeding & Care Essentials',
  'School, Travel & Accessories',
  'Toys, Games & Books',
  'Nursery & Kids Furniture',
  'Safety & Baby-Proofing',
  'Party Supplies',
  'Gift Sets & Bundles',
  'Maternity & Postpartum',
]

export default function KidsAndBaby() {
  return (
    <HubBrowse hub="kids_and_baby" title="Kids & Baby" accentClass="bg-hub-kidsbaby" categories={KIDS_BABY_CATEGORIES} />
  )
}

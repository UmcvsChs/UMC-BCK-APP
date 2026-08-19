import HubBrowse from '../components/HubBrowse'

// Real categories for a genuinely large, distinct market — confirmed by
// direct field survey feedback, not assumed. Covers hand tools through
// heavy lifting/rigging gear and site machinery, the real breadth of
// what a construction/industrial tools market actually trades in.
const POWER_INDUSTRIAL_CATEGORIES = [
  'Hand Tools & Wrenches',
  'Power Tools',
  'Welding & Cutting Equipment',
  'Lifting & Rigging Equipment',
  'Motors, Generators & Pumps',
  'Industrial Fans & Ventilation',
  'Measuring & Surveying Equipment',
  'Site & Construction Equipment',
  'Chains, Ropes & Fasteners',
  'Safety & PPE',
]

export default function PowerIndustrialTools() {
  return (
    <HubBrowse
      hub="power_industrial_tools"
      title="Power & Industrial Tools"
      accentClass="bg-hub-industrial"
      categories={POWER_INDUSTRIAL_CATEGORIES}
    />
  )
}

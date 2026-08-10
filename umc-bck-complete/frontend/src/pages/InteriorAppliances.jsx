import HubBrowse from '../components/HubBrowse'

const INTERIOR_CATEGORIES = ['Furniture', 'Curtains & rugs', 'Kitchen appliances', 'Cooling & heating', 'Refrigeration', 'TVs & entertainment']

export default function InteriorAppliances() {
  return (
    <HubBrowse hub="interior_appliances" title="Interior & Home Appliances" accentClass="bg-hub-interior" categories={INTERIOR_CATEGORIES} />
  )
}

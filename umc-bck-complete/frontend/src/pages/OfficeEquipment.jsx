import HubBrowse from '../components/HubBrowse'

const OFFICE_CATEGORIES = [
  'Office furniture', 'Printers & copiers', 'Binding & laminating equipment',
  'Paper & printing supplies', 'Writing & desk supplies', 'Office electronics',
]

export default function OfficeEquipment() {
  return (
    <HubBrowse hub="office_equipment" title="Office Equipment & Stationery" accentClass="bg-hub-office" categories={OFFICE_CATEGORIES} />
  )
}

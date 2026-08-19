import HubBrowse from '../components/HubBrowse'

const ELECTRICAL_CATEGORIES = ['Cables & wiring', 'Switches & sockets', 'Circuit breakers', 'Transformers', 'Industrial installation equipment', 'Generators', 'Electricals, lighting & fittings']

export default function ElectricalEquipment() {
  return (
    <HubBrowse hub="electrical_equipment" title="Electrical Equipment" accentClass="bg-hub-electrical" categories={ELECTRICAL_CATEGORIES} />
  )
}

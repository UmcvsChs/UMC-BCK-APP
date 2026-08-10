import HubBrowse from '../components/HubBrowse'

const GREEN_ENERGY_CATEGORIES = ['Solar panels', 'Inverters', 'Deep cycle batteries', 'Solar accessories (cables, charge controllers)', 'Wind & other renewable']

export default function GreenEnergy() {
  return (
    <HubBrowse hub="green_energy" title="Green Energy" accentClass="bg-hub-greenenergy" categories={GREEN_ENERGY_CATEGORIES} />
  )
}

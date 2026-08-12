import HubBrowse from '../components/HubBrowse'

const PLASTIC_CATEGORIES = ['Kitchen utensils', 'Storage containers', 'Buckets & basins', 'Plastic chairs & tables', 'Disposable & party plasticware']

export default function PlasticUtensils() {
  return (
    <HubBrowse hub="plastic_utensils" title="Plastic & Utensils" accentClass="bg-hub-plastic" categories={PLASTIC_CATEGORIES} />
  )
}

import HubBrowse from '../components/HubBrowse'

const TEXTILE_CATEGORIES = ['Ankara fabric', 'Lace fabric', 'Guinea brocade', 'Aso-oke', 'Chiffon & silk', 'Plain & cotton fabric']

export default function Textile() {
  return (
    <HubBrowse hub="textile" title="Textile" accentClass="bg-hub-textile" categories={TEXTILE_CATEGORIES} />
  )
}

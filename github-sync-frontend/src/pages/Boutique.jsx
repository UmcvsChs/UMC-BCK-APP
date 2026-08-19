import HubBrowse from '../components/HubBrowse'

const BOUTIQUE_CATEGORIES = ["Men's wear", "Women's wear", "Children's wear", 'Native & traditional wear', 'Accessories']

export default function Boutique() {
  return (
    <HubBrowse hub="boutique" title="Boutique" accentClass="bg-hub-boutique" categories={BOUTIQUE_CATEGORIES} />
  )
}

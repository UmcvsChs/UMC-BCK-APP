import HubBrowse from '../components/HubBrowse'

const PLASTIC_CATEGORIES = [
  'Cookware', 'Food Storage & Containers', 'Cutlery & Utensils', 'Dinnerware & Servingware',
  'Drinkware', 'Baking & Prep Tools', 'Kitchen Gadgets & Small Tools', 'Plastic Household Items',
]

export default function PlasticUtensils() {
  return (
    <HubBrowse hub="plastic_utensils" title="Plastic & Kitchen Utensils" accentClass="bg-hub-plastic" categories={PLASTIC_CATEGORIES} />
  )
}

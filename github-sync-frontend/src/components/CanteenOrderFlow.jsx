import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import FastFoodOrderBuilder from './FastFoodOrderBuilder'

const CANTEEN_CATEGORIES = ['All', 'Nigerian Meals', 'Northern Dishes', 'Fast Food', 'Shawarma', 'Suya & Grills', 'Pizza', 'Cakes & Desserts', 'Drinks']

// Real canteen ordering flow — matches the reference exactly: category
// tabs, then straight into "Build your order." No vendor-picker step
// was ever part of the real design; that was a genuine mistake added
// on top of it, now removed.
export default function CanteenOrderFlow() {
  const [category, setCategory] = useState('Fast Food')

  return (
    <div>
      <div className="flex gap-2 px-4 pt-2 pb-3 overflow-x-auto">
        {CANTEEN_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 text-sm px-3 py-1.5 rounded-full border ${
              category === c ? 'bg-hub-canteen text-white border-hub-canteen' : 'border-ink/20 text-ink/60'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4">
        <FastFoodOrderBuilder category={category === 'All' ? null : category} />
      </div>
    </div>
  )
}

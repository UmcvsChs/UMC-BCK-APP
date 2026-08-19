import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Real "starter kit" picker — only ever shown to a genuinely new, empty
// store. Claiming a kit copies its real items straight into the
// seller's own store; nothing about their account, wallet, or identity
// is touched or reassigned. The moment they edit anything, it's fully
// theirs.
export default function StarterTemplatePicker({ sellerId, hub, onClaimed }) {
  const [loading, setLoading] = useState(true)
  const [hasProducts, setHasProducts] = useState(true)
  const [templates, setTemplates] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [itemsByTemplate, setItemsByTemplate] = useState({})
  const [claiming, setClaiming] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function load() {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)

      if (count && count > 0) {
        setHasProducts(true)
        setLoading(false)
        return
      }
      setHasProducts(false)

      const { data } = await supabase
        .from('starter_templates')
        .select('id, category, template_label')
        .eq('hub', hub)
        .eq('is_claimed', false)
        .order('category')
      setTemplates(data || [])
      setLoading(false)
    }
    load()
  }, [sellerId, hub])

  async function toggleExpand(templateId) {
    if (expandedId === templateId) {
      setExpandedId(null)
      return
    }
    setExpandedId(templateId)
    if (!itemsByTemplate[templateId]) {
      const { data } = await supabase
        .from('starter_template_items')
        .select('item_name')
        .eq('template_id', templateId)
      setItemsByTemplate((prev) => ({ ...prev, [templateId]: data || [] }))
    }
  }

  async function claim(templateId) {
    setClaiming(templateId)
    const { data, error } = await supabase.rpc('claim_starter_template', {
      p_template_id: templateId,
      p_seller_id: sellerId,
    })
    setClaiming(null)
    if (error) {
      alert(error.message)
      return
    }
    alert(`Real starter kit added — ${data.items_copied} items are now in your store. Edit any of them to make it yours.`)
    onClaimed?.()
  }

  if (loading || hasProducts || dismissed) return null

  if (templates.length === 0) {
    return null // Real, empty pool right now — no starter kits available for this hub yet.
  }

  return (
    <div className="mb-5 rounded border-2 border-indigo/30 bg-indigo/5 p-4">
      <p className="text-sm font-semibold text-indigo mb-1">🚀 New here? Start with a ready-made store</p>
      <p className="text-xs text-ink/60 mb-3">
        Pick a real starter kit below — real items, real prices, real photos already loaded. Nothing is final: edit
        the name, prices, quantities, or photos to make it genuinely your own store.
      </p>
      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="rounded border border-indigo/20 bg-paper px-3 py-2">
            <button onClick={() => toggleExpand(t.id)} className="w-full flex items-center justify-between text-left">
              <span className="text-sm font-medium">{t.template_label}</span>
              <span className="text-xs text-ink/40">{expandedId === t.id ? '▲' : '▼'}</span>
            </button>
            {expandedId === t.id && (
              <div className="mt-2 pt-2 border-t border-ink/10">
                <p className="text-xs text-ink/50 mb-2">
                  {(itemsByTemplate[t.id] || []).map((i) => i.item_name).join(', ') || 'Loading…'}
                </p>
                <button
                  onClick={() => claim(t.id)}
                  disabled={claiming === t.id}
                  className="w-full text-xs bg-indigo text-white rounded py-2 disabled:opacity-60"
                >
                  {claiming === t.id ? 'Setting up your store…' : 'Use this starter kit'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => setDismissed(true)} className="text-xs text-ink/40 mt-3 underline">
        I'll set up my own from scratch
      </button>
    </div>
  )
}

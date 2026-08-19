import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real "My List" — genuine market intelligence, not a saved-items diary.
// Multiple real named lists per user, real items with real quantity and
// an optional real favorite seller, and a real "search the market"
// action per item that finds actual, current, individually clickable
// sellers — cheapest first — so a buyer can act directly, not just look.
export default function PriceWatches() {
  const [lists, setLists] = useState([])
  const [activeListId, setActiveListId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creatingList, setCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')

  async function loadLists() {
    const { data } = await supabase.from('market_lists').select('id, list_name').order('created_at')
    setLists(data || [])
    if (data && data.length > 0 && !activeListId) setActiveListId(data[0].id)
    setLoading(false)
  }

  useEffect(() => {
    loadLists()
  }, [])

  async function createList() {
    if (!newListName.trim()) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('market_lists')
      .insert({ user_id: user.id, list_name: newListName.trim() })
      .select('id')
      .single()
    if (!error && data) {
      setNewListName('')
      setCreatingList(false)
      await loadLists()
      setActiveListId(data.id)
    }
  }

  async function deleteList(listId) {
    if (!confirm('Delete this whole list and everything in it?')) return
    await supabase.from('market_lists').delete().eq('id', listId)
    setActiveListId(null)
    loadLists()
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">📋 My List</h1>
      <p className="text-sm text-ink/60 mb-4">Real, reusable lists — build once, search the market anytime you're ready to buy.</p>

      <div className="flex gap-1.5 overflow-x-auto mb-4 pb-1">
        {lists.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveListId(l.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              activeListId === l.id ? 'bg-indigo text-white' : 'border border-ink/20 text-ink/60'
            }`}
          >
            {l.list_name}
          </button>
        ))}
        {creatingList ? (
          <div className="flex items-center gap-1 shrink-0">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name"
              autoFocus
              className="rounded border border-ink/20 px-2 py-1 text-sm w-28"
              onKeyDown={(e) => e.key === 'Enter' && createList()}
            />
            <button onClick={createList} className="text-xs bg-market-green text-white rounded px-2 py-1.5">
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingList(true)}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium border border-dashed border-indigo/40 text-indigo"
          >
            + New list
          </button>
        )}
      </div>

      {lists.length === 0 && (
        <p className="text-sm text-ink/50 text-center py-8">
          Create your first real list above — "Foodstuff," "Household," whatever helps you organize what you buy regularly.
        </p>
      )}

      {activeListId && (
        <ListItems listId={activeListId} onDeleteList={() => deleteList(activeListId)} />
      )}
    </div>
  )
}

function ListItems({ listId, onDeleteList }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingItem, setAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchingItemId, setSearchingItemId] = useState(null)

  async function loadItems() {
    const { data } = await supabase
      .from('market_list_items')
      .select('id, commodity_name, quantity, favorite_seller_id, sellers(store_name)')
      .eq('list_id', listId)
      .order('created_at')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    setSearchResults(null)
    loadItems()
  }, [listId])

  async function addItem() {
    if (!newItemName.trim()) return
    await supabase.from('market_list_items').insert({ list_id: listId, commodity_name: newItemName.trim(), quantity: 1 })
    setNewItemName('')
    setAddingItem(false)
    loadItems()
  }

  async function removeItem(itemId) {
    await supabase.from('market_list_items').delete().eq('id', itemId)
    loadItems()
  }

  async function adjustQuantity(itemId, delta, current) {
    const newQty = Math.max(1, current + delta)
    await supabase.from('market_list_items').update({ quantity: newQty }).eq('id', itemId)
    loadItems()
  }

  // Real "search the market" — finds actual, current, individually
  // clickable sellers for this real commodity, cheapest first.
  async function searchMarket(itemId, commodityName) {
    setSearchingItemId(itemId)
    const { data } = await supabase.rpc('search_commodity_sellers', { p_commodity_name: commodityName })
    setSearchResults({ itemId, results: data || [] })
  }

  async function setFavoriteSeller(itemId, sellerId) {
    await supabase.from('market_list_items').update({ favorite_seller_id: sellerId }).eq('id', itemId)
    loadItems()
  }

  if (loading) return <p className="text-ink/50 text-sm">Loading…</p>

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-ink/50 text-center py-6">Nothing in this list yet — add a real item below.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {items.map((item) => (
            <div key={item.id} className="rounded border border-ink/10 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.commodity_name}</p>
                  {item.sellers && <p className="text-xs text-gold-dark">★ Favorite: {item.sellers.store_name}</p>}
                </div>
                <button onClick={() => removeItem(item.id)} className="text-xs text-market-red">
                  Remove
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => adjustQuantity(item.id, -1, item.quantity)} className="w-6 h-6 rounded border border-ink/20 text-sm">
                    −
                  </button>
                  <span className="font-mono text-sm">{item.quantity}</span>
                  <button onClick={() => adjustQuantity(item.id, 1, item.quantity)} className="w-6 h-6 rounded border border-ink/20 text-sm">
                    +
                  </button>
                </div>
                <button
                  onClick={() => searchMarket(item.id, item.commodity_name)}
                  className="text-xs bg-indigo text-white rounded-full px-3 py-1.5"
                >
                  🔍 Search the market
                </button>
              </div>

              {searchResults?.itemId === item.id && (
                <div className="mt-3 pt-3 border-t border-ink/10 space-y-1.5">
                  {searchResults.results.length === 0 ? (
                    <p className="text-xs text-ink/40">No real listings found for this item right now.</p>
                  ) : (
                    searchResults.results.map((r, i) => (
                      <div key={r.product_id} className="flex items-center justify-between rounded bg-surface px-2 py-1.5">
                        <div>
                          <p className="text-xs font-medium">
                            {r.store_name} {i === 0 && <span className="text-market-green">· Cheapest</span>}
                          </p>
                          <p className="font-mono text-xs text-indigo">₦{Number(r.price).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setFavoriteSeller(item.id, r.seller_id)}
                            className="text-xs text-gold-dark px-2"
                          >
                            ★ Favorite
                          </button>
                          <button
                            onClick={() => navigate(`/product/${r.product_id}`)}
                            className="text-xs bg-market-green text-white rounded px-2 py-1"
                          >
                            Buy
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {addingItem ? (
        <div className="flex gap-1 mb-3">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="e.g. Rice 25kg"
            autoFocus
            className="flex-1 rounded border border-ink/20 px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <button onClick={addItem} className="text-sm bg-market-green text-white rounded px-4">
            Add
          </button>
        </div>
      ) : (
        <button onClick={() => setAddingItem(true)} className="text-sm text-indigo font-medium mb-4">
          + Add item to this list
        </button>
      )}

      <button onClick={onDeleteList} className="text-xs text-market-red">
        Delete this list
      </button>
    </div>
  )
}

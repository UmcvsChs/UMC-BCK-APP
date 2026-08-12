import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function StoreMessages({ storeId }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [myUserId, setMyUserId] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('store_messages')
      .select('id, message, created_at, sender_id, profiles(full_name)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data?.user?.id || null))
    load()

    // Real-time — messages from the director or any attendant appear
    // live for everyone watching this store's channel.
    const channel = supabase
      .channel(`store-messages-${storeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'store_messages', filter: `store_id=eq.${storeId}` }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    const { error } = await supabase.rpc('send_store_message', { p_store_id: storeId, p_message: text.trim() })
    setSending(false)
    if (error) {
      alert(error.message)
      return
    }
    setText('')
    load()
  }

  return (
    <div>
      <p className="text-xs text-ink/50 mb-3">
        A real, shared channel for this store — the director and every active attendant see the same conversation.
      </p>

      {loading && <p className="text-ink/50">Loading…</p>}

      <div className="space-y-2 mb-3 max-h-96 overflow-y-auto">
        {messages.length === 0 && !loading && <p className="text-xs text-ink/50">No messages yet — say something.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === myUserId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded px-3 py-2 max-w-[80%] ${mine ? 'bg-indigo text-paper' : 'bg-white border border-ink/10'}`}>
                {!mine && <p className="text-xs font-medium text-gold-dark mb-0.5">{m.profiles?.full_name || 'Team member'}</p>}
                <p className="text-sm">{m.message}</p>
                <p className={`text-xs mt-0.5 ${mine ? 'text-paper/60' : 'text-ink/40'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the team…"
          className="flex-1 text-sm rounded border border-ink/20 px-3 py-2"
        />
        <button type="submit" disabled={sending} className="text-sm bg-indigo text-white rounded px-4 disabled:opacity-60">
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}


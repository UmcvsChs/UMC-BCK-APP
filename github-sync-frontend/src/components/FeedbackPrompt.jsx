import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Real, general "how's the app working for you" feedback — deliberately
// separate from rating the person on the other end of a transaction.
// The first ask is genuinely tiny — one tap, three faces, nothing to
// type — since the size of that first ask is what actually determines
// whether real people respond at all. The deeper "tell us more" box only
// opens if they tapped something, and only shows every so often (or
// immediately if the quick rating was low) so it never feels like
// nagging.
export default function FeedbackPrompt({ role, contextType, contextId, roleLabel }) {
  const [alreadyGiven, setAlreadyGiven] = useState(true)
  const [quickRating, setQuickRating] = useState(null)
  const [showDeeper, setShowDeeper] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [deeperEligible, setDeeperEligible] = useState(false)
  const [pendingFeedbackId, setPendingFeedbackId] = useState(null)

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: existing } = await supabase
        .from('app_feedback')
        .select('id')
        .eq('context_type', contextType)
        .eq('context_id', contextId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (existing) {
        setAlreadyGiven(true)
        return
      }
      setAlreadyGiven(false)

      // Real, light frequency logic — decide up front whether this
      // particular time should offer the deeper box if they engage, so
      // it doesn't feel like every single prompt demands an essay.
      const { count } = await supabase
        .from('app_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', role)
      const isFirstTime = (count || 0) === 0
      const everyThird = (count || 0) % 3 === 0
      setDeeperEligible(isFirstTime || everyThird)
    }
    check()
  }, [contextType, contextId, role])

  async function submitQuick(rating) {
    setQuickRating(rating)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: inserted } = await supabase
      .from('app_feedback')
      .insert({ user_id: user.id, role, context_type: contextType, context_id: contextId, quick_rating: rating })
      .select('id')
      .single()

    // A low rating always genuinely deserves the chance to say more,
    // regardless of the normal every-third-time pacing.
    if (rating === 1 || deeperEligible) {
      setPendingFeedbackId(inserted?.id)
      setShowDeeper(true)
    } else {
      setSubmitted(true)
    }
  }

  async function submitDeeper() {
    if (pendingFeedbackId && feedbackText.trim()) {
      await supabase.from('app_feedback').update({ feedback_text: feedbackText.trim() }).eq('id', pendingFeedbackId)
    }
    setSubmitted(true)
    setShowDeeper(false)
  }

  if (alreadyGiven || dismissed || submitted) return null

  if (showDeeper) {
    return (
      <div className="rounded border border-gold/40 bg-gold/10 p-3 my-3">
        <p className="text-sm font-medium mb-2">
          {quickRating === 1 ? "Sorry it wasn't great — what happened?" : 'Anything we should know or improve?'}
        </p>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Real feedback, in your own words — this actually reaches the team."
          className="w-full rounded border border-ink/20 px-3 py-2 text-sm mb-2"
          rows={3}
        />
        <div className="flex gap-2">
          <button onClick={submitDeeper} className="text-sm bg-indigo text-paper rounded px-4 py-1.5">
            Send
          </button>
          <button onClick={() => setSubmitted(true)} className="text-sm text-ink/50">
            Skip
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between rounded bg-ink/5 px-3 py-2 my-3">
      <p className="text-sm text-ink/70">How was this {roleLabel || 'experience'}?</p>
      <div className="flex items-center gap-2">
        <button onClick={() => submitQuick(1)} className="text-xl hover:scale-110 transition-transform" aria-label="Frustrated">
          😞
        </button>
        <button onClick={() => submitQuick(2)} className="text-xl hover:scale-110 transition-transform" aria-label="Okay">
          😐
        </button>
        <button onClick={() => submitQuick(3)} className="text-xl hover:scale-110 transition-transform" aria-label="Happy">
          😊
        </button>
        <button onClick={() => setDismissed(true)} className="text-xs text-ink/30 ml-1">
          ✕
        </button>
      </div>
    </div>
  )
}

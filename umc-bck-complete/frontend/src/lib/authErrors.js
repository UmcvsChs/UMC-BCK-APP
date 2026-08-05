// Real defensive helper — Supabase (or the network layer in front of it)
// doesn't always return a clean, human-readable error.message. When it
// doesn't, this ensures the person sees a genuine, readable sentence
// instead of whatever raw, unhelpful value came back (including literally
// "{}", which is what an empty/malformed error object stringifies to).
export function readableAuthError(error) {
  if (!error) return null
  const msg = typeof error.message === 'string' ? error.message.trim() : ''

  // A real message worth showing as-is.
  if (msg && msg !== '{}' && msg !== '[object Object]') return msg

  // Common real Supabase auth failures, given a genuine, specific message
  // rather than a generic fallback, since these are the most frequent
  // real cases signup/sign-in actually hit.
  if (error.status === 400 || error.status === 422) {
    return 'That email or password isn\u2019t valid — double-check both and try again.'
  }
  if (error.status === 401) {
    return 'Incorrect email or password.'
  }
  if (error.status === 429) {
    return 'Too many attempts — please wait a moment and try again.'
  }

  return 'Something went wrong on our end — please try again in a moment.'
}

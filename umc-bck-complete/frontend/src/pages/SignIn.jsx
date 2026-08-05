import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { readableAuthError } from '../lib/authErrors'

export default function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError(readableAuthError(error))
      return
    }
    navigate('/marketplace')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-display font-semibold text-indigo mb-1">Welcome back</h1>
        <p className="text-sm text-ink/60 mb-6">Sign in to your UMC-BCK account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-market-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-ink/60 mt-4 text-center">
          New to UMC-BCK?{' '}
          <Link to="/sign-up" className="text-indigo font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}

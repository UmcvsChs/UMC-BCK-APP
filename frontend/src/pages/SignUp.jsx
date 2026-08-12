import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { readableAuthError } from '../lib/authErrors'

// Every role a person can register as — matches public.user_role exactly.
// 'admin' is deliberately excluded: nobody signs themselves up as an admin.
const ROLES = [
  { value: 'buyer', label: 'Buyer — I want to shop' },
  { value: 'seller', label: 'Seller — I run a store' },
  { value: 'canteen_operator', label: 'Canteen operator — I sell food' },
  { value: 'delivery_agent', label: 'Delivery agent — I deliver orders' },
  { value: 'repairer', label: 'Repairer — I fix phones & devices' },
  { value: 'logistics_company', label: 'Logistics company' },
]

export default function SignUp() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [nin, setNin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [primaryRole, setPrimaryRole] = useState('buyer')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // full_name, phone, and primary_role all travel in metadata — the
    // handle_new_profile trigger reads them from here to populate the real
    // profiles row atomically with account creation, not as a follow-up
    // call that could be skipped.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, nin, primary_role: primaryRole },
      },
    })

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
        <h1 className="text-2xl font-display font-semibold text-indigo mb-1">Kasuwa don kowa</h1>
        <p className="text-sm text-ink/60 mb-6">Create your UMC-BCK account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium mb-1">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="080..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="nin" className="block text-sm font-medium mb-1">
              NIN (National Identification Number, optional for now)
            </label>
            <input
              id="nin"
              type="text"
              placeholder="11-digit NIN"
              value={nin}
              onChange={(e) => setNin(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
            <p className="text-xs text-ink/40 mt-1">
              Real ID verification against NIMC isn't built yet — this is stored for a future verification step, not
              checked against anything today.
            </p>
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium mb-2">I am joining as a...</legend>
            <div className="space-y-2">
              {ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center gap-3 rounded border px-3 py-2 cursor-pointer transition-colors
                    ${primaryRole === role.value ? 'border-indigo bg-indigo/5' : 'border-ink/15'}`}
                >
                  <input
                    type="radio"
                    name="primaryRole"
                    value={role.value}
                    checked={primaryRole === role.value}
                    onChange={(e) => setPrimaryRole(e.target.value)}
                    className="accent-indigo"
                  />
                  <span className="text-sm">{role.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-ink/60 mt-4 text-center">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-indigo font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const NIGERIAN_BANKS = [
  'Access Bank', 'Alternative Bank', 'Carbon (Paylater)', 'Citibank Nigeria', 'Ecobank Nigeria', 'Eyowo',
  'Fairmoney', 'Fidelity Bank', 'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Globus Bank',
  'Guaranty Trust Bank (GTBank)', 'Jaiz Bank', 'Keystone Bank', 'Kuda Bank', 'Lotus Bank', 'Moniepoint',
  'OPay', 'Optimus Bank', 'PalmPay', 'Parallex Bank', 'Polaris Bank', 'Premium Trust Bank', 'Providus Bank',
  'Rubies Bank', 'Signature Bank', 'Sparkle', 'Stanbic IBTC Bank', 'Standard Chartered Bank', 'Sterling Bank',
  'Suntrust Bank', 'Taj Bank', 'Titan Trust Bank', 'Union Bank of Nigeria', 'United Bank for Africa (UBA)',
  'Unity Bank', 'Wema Bank', 'Zenith Bank',
]

// Real threshold, fee, and resend/attempt caps — mirrors the real
// database defaults so the caveat shown here matches what the backend
// actually enforces.
const OTP_THRESHOLD = 200000
const PROCESSING_FEE = 100

export default function SellerWithdraw() {
  const [balance, setBalance] = useState(0)
  const [accounts, setAccounts] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [newBank, setNewBank] = useState('')
  const [newAccountNumber, setNewAccountNumber] = useState('')
  const [newAccountName, setNewAccountName] = useState('')

  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [caveatChecked, setCaveatChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [activeOtpRequest, setActiveOtpRequest] = useState(null)
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState(null)

  async function loadAll() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: walletData }, { data: accountsData }, { data: requestsData }] = await Promise.all([
      supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('seller_bank_accounts').select('id, bank_name, account_number, account_name, status, activates_at').neq('status', 'removed').order('requested_at'),
      supabase
        .from('seller_withdrawal_requests')
        .select('id, amount, processing_fee, status, otp_required, otp_verified_at, otp_locked_at, requested_at')
        .order('requested_at', { ascending: false })
        .limit(10),
    ])

    setBalance(walletData?.balance || 0)
    setAccounts(accountsData || [])
    setRequests(requestsData || [])
    setLoading(false)

    // Real, resumable OTP step — if there's already a pending
    // large withdrawal awaiting verification, show that step again
    // rather than losing it on a refresh.
    const pending = (requestsData || []).find((r) => r.otp_required && !r.otp_verified_at && !r.otp_locked_at && r.status === 'pending')
    if (pending) setActiveOtpRequest(pending)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const isLargeWithdrawal = Number(amount || 0) >= OTP_THRESHOLD

  async function addBankAccount(e) {
    e.preventDefault()
    if (!newBank || !newAccountNumber.trim() || !newAccountName.trim()) return
    const { error } = await supabase.rpc('add_seller_bank_account', {
      p_bank_name: newBank,
      p_account_number: newAccountNumber.trim(),
      p_account_name: newAccountName.trim(),
    })
    if (error) {
      alert(error.message)
      return
    }
    setNewBank('')
    setNewAccountNumber('')
    setNewAccountName('')
    loadAll()
  }

  async function removeAccount(id) {
    await supabase.rpc('remove_seller_bank_account', { p_account_id: id })
    loadAll()
  }

  async function submitWithdrawal(e) {
    e.preventDefault()
    setError(null)
    const numAmount = Number(amount)
    if (!selectedAccountId) {
      setError('Please select a bank account')
      return
    }
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a real amount')
      return
    }
    if (isLargeWithdrawal && !caveatChecked) {
      setError('Please confirm the caution note below before withdrawing this amount')
      return
    }

    setSubmitting(true)
    const { data: requestId, error: reqError } = await supabase.rpc('request_seller_withdrawal', {
      p_bank_account_id: selectedAccountId,
      p_amount: numAmount,
      p_caveat_acknowledged: caveatChecked,
    })
    setSubmitting(false)

    if (reqError) {
      setError(reqError.message)
      return
    }

    setAmount('')
    setCaveatChecked(false)
    await loadAll()

    if (isLargeWithdrawal) {
      setActiveOtpRequest({ id: requestId })
    }
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setOtpError(null)
    const { data: ok, error: verifyError } = await supabase.rpc('verify_seller_withdrawal_otp', {
      p_request_id: activeOtpRequest.id,
      p_code: otpInput.trim(),
    })
    if (verifyError) {
      // Real, deliberate distinction — a lock is final for this
      // request, so the form should genuinely go away rather than
      // invite more attempts against something that can never
      // succeed again.
      if (verifyError.message.includes('locked')) {
        setActiveOtpRequest(null)
        setOtpInput('')
        loadAll()
        return
      }
      setOtpError(verifyError.message)
      return
    }
    if (!ok) {
      setOtpError('That code is not correct — please try again')
      return
    }
    setActiveOtpRequest(null)
    setOtpInput('')
    loadAll()
  }

  async function resendOtp() {
    setOtpError(null)
    const { error: resendError } = await supabase.rpc('resend_seller_withdrawal_otp', { p_request_id: activeOtpRequest.id })
    if (resendError) {
      setOtpError(resendError.message)
      return
    }
    setOtpError('A new real code has been sent.')
  }

  if (loading) return <p className="text-ink/50 p-4">Loading…</p>

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-surface p-4">
        <p className="text-xs text-ink/50">Real wallet balance</p>
        <p className="text-2xl font-display font-semibold text-market-green">₦{Number(balance).toLocaleString()}</p>
      </div>

      {activeOtpRequest && (
        <div className="rounded-xl bg-gold/10 border border-gold/40 p-4">
          <p className="text-sm font-semibold mb-1">Enter the real code sent to your two phone numbers and email</p>
          <p className="text-xs text-ink/60 mb-3">This withdrawal is on hold until the real code is confirmed.</p>
          <form onSubmit={verifyOtp} className="space-y-2">
            <input
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="w-full rounded border border-ink/20 px-3 py-2 text-center text-lg tracking-widest"
            />
            {otpError && <p className="text-xs text-market-red">{otpError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-market-green text-white rounded py-2 text-sm font-medium">
                Confirm
              </button>
              <button type="button" onClick={resendOtp} className="flex-1 border border-ink/20 rounded py-2 text-sm">
                Resend code
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl bg-surface p-4">
        <p className="text-sm font-semibold mb-2">Your bank accounts ({accounts.length}/2)</p>
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded bg-white px-3 py-2 mb-2">
            <div>
              <p className="text-sm font-medium">{a.bank_name} — {a.account_number}</p>
              <p className="text-xs text-ink/50">
                {a.account_name}
                {a.status === 'pending_activation' && (
                  <span className="text-gold-dark"> · activates {new Date(a.activates_at).toLocaleString()}</span>
                )}
              </p>
            </div>
            <button onClick={() => removeAccount(a.id)} className="text-xs text-market-red">
              Remove
            </button>
          </div>
        ))}
        {accounts.length < 2 && (
          <form onSubmit={addBankAccount} className="space-y-2 mt-2 pt-2 border-t border-ink/10">
            <select value={newBank} onChange={(e) => setNewBank(e.target.value)} className="w-full rounded border border-ink/20 px-3 py-2 text-sm">
              <option value="">-- Select bank --</option>
              {NIGERIAN_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <input
              value={newAccountNumber}
              onChange={(e) => setNewAccountNumber(e.target.value)}
              placeholder="Account number"
              className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
            />
            <input
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="Account name"
              className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
            />
            <button type="submit" className="w-full border border-dashed border-ink/30 rounded py-2 text-sm text-ink/60">
              + Add account
            </button>
          </form>
        )}
        <p className="text-xs text-ink/40 mt-2">A newly added or changed account takes 24 real hours to activate, to protect you if it's ever compromised.</p>
      </div>

      <div className="rounded-xl bg-surface p-4">
        <p className="text-sm font-semibold mb-2">Withdraw</p>
        <form onSubmit={submitWithdrawal} className="space-y-2">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          >
            <option value="">-- Select account to withdraw to --</option>
            {accounts.filter((a) => a.status === 'active').map((a) => (
              <option key={a.id} value={a.id}>{a.bank_name} — {a.account_number}</option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder="Amount (₦)"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />

          {isLargeWithdrawal && (
            <div className="rounded bg-gold/10 border border-gold/40 px-3 py-2">
              <p className="text-xs text-ink/70">
                ⚠️ Withdrawals of ₦200,000 and above attract a real ₦{PROCESSING_FEE} processing fee, and require a
                real code sent to your two phone numbers and email before it's paid out. If you'd rather avoid the
                fee, consider withdrawing a lower amount at a time.
              </p>
              <label className="flex items-start gap-2 mt-2 text-xs">
                <input type="checkbox" checked={caveatChecked} onChange={(e) => setCaveatChecked(e.target.checked)} className="mt-0.5" />
                <span>I understand and want to proceed with this amount.</span>
              </label>
            </div>
          )}

          {error && <p className="text-xs text-market-red">{error}</p>}

          <button type="submit" disabled={submitting} className="w-full bg-market-green text-white rounded py-2 text-sm font-medium disabled:opacity-60">
            {submitting ? 'Submitting…' : 'Request withdrawal'}
          </button>
        </form>
      </div>

      <div className="rounded-xl bg-surface p-4">
        <p className="text-sm font-semibold mb-2">Recent withdrawals</p>
        {requests.length === 0 && <p className="text-xs text-ink/50">No real withdrawals yet.</p>}
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded bg-white px-3 py-2 mb-2 text-sm">
            <div>
              <p className="font-medium">₦{Number(r.amount).toLocaleString()}</p>
              {r.processing_fee > 0 && <p className="text-xs text-ink/40">Fee: ₦{Number(r.processing_fee).toLocaleString()}</p>}
            </div>
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                r.status === 'paid'
                  ? 'bg-market-green/10 text-market-green'
                  : r.status === 'rejected'
                    ? 'bg-market-red/10 text-market-red'
                    : 'bg-gold/10 text-gold-dark'
              }`}
            >
              {r.otp_locked_at ? 'Locked — contact support' : r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

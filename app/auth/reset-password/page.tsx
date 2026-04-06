'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function ResetPassword() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [ready,     setReady]     = useState(false)

  // Supabase handles the token from the URL hash automatically on getSession
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== password2) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/'), 2000)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 text-xl mx-auto mb-5">
            ✓
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Password updated</h2>
          <p className="text-slate-500 text-sm">Redirecting you home…</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-4">Invalid or expired reset link.</p>
          <Link href="/auth/forgot-password" className="text-red-400 hover:text-red-300 text-sm font-medium transition">
            Request a new one →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Set new password</h1>
          <p className="text-slate-500 text-sm mt-1.5">Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition shadow-lg shadow-red-500/20"
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>

      </div>
    </div>
  )
}

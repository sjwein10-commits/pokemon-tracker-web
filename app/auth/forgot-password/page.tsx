'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 text-xl mx-auto mb-5">
            ✉
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Reset link sent</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Check your inbox at <span className="text-slate-300">{email}</span> for a password reset link.
          </p>
          <Link href="/auth/login" className="text-red-400 hover:text-red-300 text-sm font-medium transition">
            Back to Log In →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Forgot password?</h1>
          <p className="text-slate-500 text-sm mt-1.5">Enter your email and we&apos;ll send a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-5">
          <Link href="/auth/login" className="text-red-400 hover:text-red-300 font-medium transition">
            ← Back to Log In
          </Link>
        </p>

      </div>
    </div>
  )
}

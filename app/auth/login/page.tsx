'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1.5">Log in to your Card Pulse account</p>
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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-500">Password</label>
              <Link href="/auth/forgot-password" className="text-xs text-red-400/70 hover:text-red-400 transition">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition shadow-lg shadow-red-500/20 mt-2"
          >
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-5">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-red-400 hover:text-red-300 font-medium transition">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}

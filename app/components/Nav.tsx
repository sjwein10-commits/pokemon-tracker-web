'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Logo from './Logo'
import { useAuth } from '../../lib/auth-context'

const NAV_LINKS = [
  { href: '/',            label: 'Home',        exact: true },
  { href: '/binder',      label: 'Sets',        exact: false },
  { href: '/active-data', label: 'Active Data', exact: false },
  { href: '/community',   label: 'Community',   exact: false },
  { href: '/about',       label: 'About',       exact: false },
]

export default function Nav() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, loading, displayName, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo size={30} />
          <div className="leading-none">
            <p className="text-[13px] font-bold text-white tracking-tight">Card Pulse</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Pokemon Analytics</p>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-white/8 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Auth section */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-medium">Live</span>
          </div>

          {loading ? (
            <div className="w-20 h-8 rounded-lg bg-white/[0.04] animate-pulse" />
          ) : user ? (
            <>
              <span className="hidden sm:block text-[12px] text-slate-400 font-medium max-w-[120px] truncate">
                {displayName}
              </span>
              <button
                onClick={handleSignOut}
                className="text-[12px] font-medium text-slate-500 hover:text-white border border-white/[0.08] hover:border-white/[0.15] px-3 py-1.5 rounded-lg transition"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-[12px] font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition"
              >
                Log In
              </Link>
              <Link
                href="/auth/signup"
                className="text-[12px] font-semibold text-white bg-red-600 hover:bg-red-500 px-3.5 py-1.5 rounded-lg transition shadow-sm shadow-red-500/20"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  )
}
